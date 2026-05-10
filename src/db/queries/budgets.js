import { query, run } from '../database'

export const PERIODS = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']

// Multipliers to convert any period amount → monthly / annual equivalents
export const PERIOD_TO_MONTHLY = {
  weekly:      4.333,
  monthly:     1,
  quarterly:   1 / 3,
  semi_annual: 1 / 6,
  annual:      1 / 12
}

export const PERIOD_LABELS = {
  weekly:      'Weekly',
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  semi_annual: 'Semi-Annual',
  annual:      'Annual'
}

export const getBudgets = ({ includeArchived = false } = {}) =>
  query(`
    SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM budgets b
    LEFT JOIN categories c ON c.id = b.category_id
    ${includeArchived ? '' : 'WHERE b.archived=0'}
    ORDER BY b.period, b.name
  `)

export const getBudget = (id) =>
  query(`SELECT b.*, c.name as category_name, c.icon as category_icon
         FROM budgets b LEFT JOIN categories c ON c.id=b.category_id
         WHERE b.id=?`, [id])[0] ?? null

export const createBudget = ({ name, category_id = null, amount, period = 'monthly', start_date, end_date = null, notes = null }) =>
  run(`INSERT INTO budgets (name,category_id,amount,period,start_date,end_date,notes)
       VALUES (?,?,?,?,?,?,?)`,
    [name, category_id, amount, period, start_date ?? new Date().toISOString().slice(0, 10), end_date, notes])

export const updateBudget = (id, fields) => {
  const cols = Object.keys(fields).map(k => `${k}=?`).join(',')
  run(`UPDATE budgets SET ${cols} WHERE id=?`, [...Object.values(fields), id])
}

export const archiveBudget = (id) =>
  run('UPDATE budgets SET archived=1 WHERE id=?', [id])

// Return current-period date range for a budget
export function currentPeriodRange(budget, referenceDate = new Date()) {
  const ref = new Date(referenceDate)
  const year = ref.getFullYear()
  const month = ref.getMonth()

  switch (budget.period) {
    case 'weekly': {
      const day = ref.getDay()
      const start = new Date(ref); start.setDate(ref.getDate() - day)
      const end   = new Date(start); end.setDate(start.getDate() + 6)
      return [fmt(start), fmt(end)]
    }
    case 'monthly':
      return [fmt(new Date(year, month, 1)), fmt(new Date(year, month + 1, 0))]
    case 'quarterly': {
      const q = Math.floor(month / 3)
      return [fmt(new Date(year, q * 3, 1)), fmt(new Date(year, q * 3 + 3, 0))]
    }
    case 'semi_annual': {
      const h = month < 6 ? 0 : 6
      return [fmt(new Date(year, h, 1)), fmt(new Date(year, h + 6, 0))]
    }
    case 'annual':
      return [fmt(new Date(year, 0, 1)), fmt(new Date(year, 11, 31))]
    default:
      return [fmt(new Date(year, month, 1)), fmt(new Date(year, month + 1, 0))]
  }
}

const fmt = (d) => d.toISOString().slice(0, 10)

// Attach actual spending to each budget for the current period
export function getBudgetsWithSpending(budgets, transactions) {
  return budgets.map(budget => {
    const [start, end] = currentPeriodRange(budget)
    const spent = transactions
      .filter(t =>
        t.date >= start &&
        t.date <= end &&
        (budget.category_id == null || t.category_id === budget.category_id) &&
        t.amount < 0
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      pct: budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0,
      period_start: start,
      period_end: end
    }
  })
}
