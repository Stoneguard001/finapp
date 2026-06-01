import { query, run } from '../database'

export const getCategories = () =>
  query(`
    SELECT c.*, g.name as group_name
    FROM categories c
    LEFT JOIN category_groups g ON g.id = c.group_id
    ORDER BY c.name
  `)

export const getGroups = () =>
  query('SELECT * FROM category_groups ORDER BY sort_order, name')

export const createGroup = (name, color = '#64748b') =>
  run('INSERT INTO category_groups (name, color) VALUES (?,?)', [name, color])

export const updateGroup = (id, fields) => {
  const cols = Object.keys(fields).map(k => `${k}=?`).join(',')
  run(`UPDATE category_groups SET ${cols} WHERE id=?`, [...Object.values(fields), id])
}

export const deleteGroup = (id) => {
  run('UPDATE categories SET group_id=NULL WHERE group_id=?', [id])
  run('DELETE FROM category_groups WHERE id=?', [id])
}

export const cascadeGroupColor = (groupId, oldColor, newColor) =>
  run('UPDATE categories SET color=? WHERE group_id=? AND color=?', [newColor, groupId, oldColor])

export const getCategory = (id) =>
  query('SELECT * FROM categories WHERE id=?', [id])[0] ?? null

export const createCategory = ({ name, icon = '📦', color = '#64748b', parent_id = null, is_income = 0, group_id = null }) =>
  run('INSERT INTO categories (name,icon,color,parent_id,is_income,group_id) VALUES (?,?,?,?,?,?)',
    [name, icon, color, parent_id, is_income, group_id])

export const updateCategory = (id, fields) => {
  const cols = Object.keys(fields).map(k => `${k}=?`).join(',')
  run(`UPDATE categories SET ${cols} WHERE id=?`, [...Object.values(fields), id])
}

// Category rules
const parseRuleTags = row => ({
  ...row,
  tags: row.tags_raw
    ? row.tags_raw.split('\x1E').map(s => {
        const [id, name, color] = s.split('\x1F')
        return { id: Number(id), name, color }
      })
    : []
})

export const getRules = () =>
  query(`
    SELECT r.*, c.name as category_name,
           b.id as budget_item_id, b.name as budget_item_name,
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw
    FROM category_rules r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN budgets b ON b.id = r.budget_item_id
    LEFT JOIN rule_tags rt ON rt.rule_id = r.id
    LEFT JOIN tags tg ON tg.id = rt.tag_id
    GROUP BY r.id
    ORDER BY r.priority DESC, r.id
  `).map(parseRuleTags)

export const createRule = ({ pattern, pattern_type = 'contains', category_id, budget_item_id = null, priority = 0 }) =>
  run('INSERT INTO category_rules (pattern,pattern_type,category_id,budget_item_id,priority) VALUES (?,?,?,?,?)',
    [pattern.toUpperCase(), pattern_type, category_id, budget_item_id ?? null, priority])

export const setRuleTags = (ruleId, tagIds) => {
  run('DELETE FROM rule_tags WHERE rule_id=?', [ruleId])
  for (const tagId of tagIds) {
    run('INSERT OR IGNORE INTO rule_tags (rule_id, tag_id) VALUES (?,?)', [ruleId, tagId])
  }
}

export const updateRule = ({ id, pattern, pattern_type, category_id, budget_item_id, priority }) =>
  run('UPDATE category_rules SET pattern=?,pattern_type=?,category_id=?,budget_item_id=?,priority=? WHERE id=?',
    [pattern.toUpperCase(), pattern_type, category_id, budget_item_id ?? null, priority, id])

export const deleteRule = (id) =>
  run('DELETE FROM category_rules WHERE id=?', [id])

export const deleteCategory = (id) => {
  run('UPDATE transactions SET category_id=NULL WHERE category_id=?', [id])
  run('DELETE FROM category_rules WHERE category_id=?', [id])
  run('DELETE FROM budgets WHERE category_id=?', [id])
  run('DELETE FROM categories WHERE id=?', [id])
}

// Apply rules to a description — returns { category_id, budget_item_id, tag_ids } or null
export function applyRules(description, rules) {
  const upper = description.toUpperCase()
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  for (const rule of sorted) {
    const p = rule.pattern.toUpperCase()
    const matches =
      (rule.pattern_type === 'starts_with' && upper.startsWith(p)) ||
      (rule.pattern_type === 'regex'       && new RegExp(p, 'i').test(description)) ||
      (rule.pattern_type === 'contains'    && upper.includes(p))
    if (matches) {
      return {
        category_id:    rule.category_id,
        budget_item_id: rule.budget_item_id ?? null,
        tag_ids:        rule.tags?.map(t => t.id) ?? rule.tag_ids ?? []
      }
    }
  }
  return null
}

// Apply a rule retroactively to all existing matching transactions.
// Returns the number of transactions updated.
export function applyRuleToExisting(rule) {
  const txns = query('SELECT id, description FROM transactions')
  const upper = rule.pattern.toUpperCase()

  const matched = txns.filter(t => {
    const desc = (t.description ?? '').toUpperCase()
    if (rule.pattern_type === 'starts_with') return desc.startsWith(upper)
    if (rule.pattern_type === 'regex') {
      try { return new RegExp(rule.pattern, 'i').test(t.description ?? '') } catch { return false }
    }
    return desc.includes(upper)
  })

  for (const t of matched) {
    run('UPDATE transactions SET category_id=? WHERE id=?', [rule.category_id, t.id])
    if (rule.budget_item_id) {
      run('UPDATE transactions SET budget_item_id=? WHERE id=?', [rule.budget_item_id, t.id])
    }
    for (const tag of rule.tags ?? []) {
      run('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?,?)', [t.id, tag.id])
    }
  }

  return matched.length
}
