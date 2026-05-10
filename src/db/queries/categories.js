import { query, run } from '../database'

export const getCategories = () =>
  query('SELECT * FROM categories ORDER BY name')

export const getCategory = (id) =>
  query('SELECT * FROM categories WHERE id=?', [id])[0] ?? null

export const createCategory = ({ name, icon = '📦', color = '#64748b', parent_id = null, is_income = 0 }) =>
  run('INSERT INTO categories (name,icon,color,parent_id,is_income) VALUES (?,?,?,?,?)',
    [name, icon, color, parent_id, is_income])

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
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw
    FROM category_rules r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN rule_tags rt ON rt.rule_id = r.id
    LEFT JOIN tags tg ON tg.id = rt.tag_id
    GROUP BY r.id
    ORDER BY r.priority DESC, r.id
  `).map(parseRuleTags)

export const createRule = ({ pattern, pattern_type = 'contains', category_id, priority = 0 }) =>
  run('INSERT INTO category_rules (pattern,pattern_type,category_id,priority) VALUES (?,?,?,?)',
    [pattern.toUpperCase(), pattern_type, category_id, priority])

export const setRuleTags = (ruleId, tagIds) => {
  run('DELETE FROM rule_tags WHERE rule_id=?', [ruleId])
  for (const tagId of tagIds) {
    run('INSERT OR IGNORE INTO rule_tags (rule_id, tag_id) VALUES (?,?)', [ruleId, tagId])
  }
}

export const deleteRule = (id) =>
  run('DELETE FROM category_rules WHERE id=?', [id])

// Apply rules to a description — returns { category_id, tag_ids } or null
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
        category_id: rule.category_id,
        tag_ids:     rule.tags?.map(t => t.id) ?? rule.tag_ids ?? []
      }
    }
  }
  return null
}
