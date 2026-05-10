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
export const getRules = () =>
  query(`SELECT r.*, c.name as category_name
         FROM category_rules r
         JOIN categories c ON c.id=r.category_id
         ORDER BY r.priority DESC, r.id`)

export const createRule = ({ pattern, pattern_type = 'contains', category_id, priority = 0 }) =>
  run('INSERT INTO category_rules (pattern,pattern_type,category_id,priority) VALUES (?,?,?,?)',
    [pattern.toUpperCase(), pattern_type, category_id, priority])

export const deleteRule = (id) =>
  run('DELETE FROM category_rules WHERE id=?', [id])

// Apply rules to a description string — returns category_id or null
export function applyRules(description, rules) {
  const upper = description.toUpperCase()
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  for (const rule of sorted) {
    const p = rule.pattern.toUpperCase()
    if (rule.pattern_type === 'starts_with' && upper.startsWith(p)) return rule.category_id
    if (rule.pattern_type === 'regex' && new RegExp(p, 'i').test(description)) return rule.category_id
    if (upper.includes(p)) return rule.category_id
  }
  return null
}
