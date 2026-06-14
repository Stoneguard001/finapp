import { query } from '@/db/database'

export function buildFinancialContext() {
  const lines = [
    'You are a personal finance assistant embedded in EvenKeel, a local-first finance app.',
    'Answer questions about the user\'s finances concisely and helpfully. Never invent data not shown below.',
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    '',
  ]

  try {
    const accounts = query(`
      SELECT a.name, a.type, a.currency,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.account_id = a.id AND t.is_transfer = 0
        ), 0) AS balance
      FROM accounts a WHERE a.archived = 0 ORDER BY a.name
    `)
    if (accounts.length) {
      lines.push('## Accounts')
      for (const a of accounts) {
        lines.push(`- ${a.name} (${a.type}): ${Number(a.balance).toFixed(2)} ${a.currency}`)
      }
      lines.push('')
    }
  } catch {}

  try {
    const monthly = query(`
      SELECT strftime('%Y-%m', date) AS month,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)  AS income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS expenses
      FROM transactions
      WHERE is_transfer = 0 AND date >= date('now', '-6 months')
      GROUP BY month ORDER BY month
    `)
    if (monthly.length) {
      lines.push('## Monthly Summary (last 6 months)')
      lines.push('Month | Income | Expenses | Net')
      for (const m of monthly) {
        const net = (m.income - m.expenses).toFixed(2)
        lines.push(`${m.month} | ${Number(m.income).toFixed(2)} | ${Number(m.expenses).toFixed(2)} | ${net}`)
      }
      lines.push('')
    }
  } catch {}

  try {
    const cats = query(`
      SELECT c.name, SUM(ABS(t.amount)) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.amount < 0 AND t.is_transfer = 0
        AND t.date >= date('now', '-3 months')
      GROUP BY c.id ORDER BY total DESC LIMIT 10
    `)
    if (cats.length) {
      lines.push('## Top Spending Categories (last 3 months)')
      for (const c of cats) {
        lines.push(`- ${c.name}: ${Number(c.total).toFixed(2)}`)
      }
      lines.push('')
    }
  } catch {}

  try {
    const budgets = query(`
      SELECT b.name, b.amount, b.period,
        COALESCE((
          SELECT SUM(ABS(t.amount))
          FROM transactions t
          WHERE (t.budget_item_id = b.id OR EXISTS (
            SELECT 1 FROM transaction_splits ts
            WHERE ts.transaction_id = t.id AND ts.budget_item_id = b.id
          ))
          AND t.date >= date('now', 'start of month')
        ), 0) AS spent
      FROM budgets b WHERE b.archived = 0 ORDER BY b.name
    `)
    if (budgets.length) {
      lines.push('## Active Budgets (current month)')
      for (const b of budgets) {
        const remaining = (b.amount - b.spent).toFixed(2)
        lines.push(`- ${b.name}: budgeted ${Number(b.amount).toFixed(2)} / spent ${Number(b.spent).toFixed(2)} / remaining ${remaining} (${b.period})`)
      }
      lines.push('')
    }
  } catch {}

  return lines.join('\n')
}
