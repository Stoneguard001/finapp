import { query, run, runMany } from '../database'

export const getTransactions = ({ accountId, categoryId, startDate, endDate, limit = 500, offset = 0 } = {}) => {
  const conditions = []
  const params = []
  if (accountId)  { conditions.push('t.account_id=?');  params.push(accountId) }
  if (categoryId) { conditions.push('t.category_id=?'); params.push(categoryId) }
  if (startDate)  { conditions.push('t.date>=?');        params.push(startDate) }
  if (endDate)    { conditions.push('t.date<=?');        params.push(endDate) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  return query(`
    SELECT t.*,
           a.name  as account_name,
           a.color as account_color,
           c.name  as category_name,
           c.icon  as category_icon,
           c.color as category_color
    FROM transactions t
    LEFT JOIN accounts   a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    ${where}
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `, params)
}

export const getTransaction = (id) =>
  query(`SELECT t.*, a.name as account_name, c.name as category_name
         FROM transactions t
         LEFT JOIN accounts a ON a.id=t.account_id
         LEFT JOIN categories c ON c.id=t.category_id
         WHERE t.id=?`, [id])[0] ?? null

export const createTransaction = (tx) =>
  run(`INSERT INTO transactions
       (account_id,date,amount,description,payee,category_id,notes,import_session_id,is_transfer,cleared)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [tx.account_id, tx.date, tx.amount, tx.description, tx.payee ?? null,
     tx.category_id ?? null, tx.notes ?? null, tx.import_session_id ?? null,
     tx.is_transfer ?? 0, tx.cleared ?? 1])

export const createTransactions = (txList) =>
  runMany(`INSERT INTO transactions
           (account_id,date,amount,description,payee,category_id,notes,import_session_id,is_transfer,cleared)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
    txList.map(tx => [
      tx.account_id, tx.date, tx.amount, tx.description, tx.payee ?? null,
      tx.category_id ?? null, tx.notes ?? null, tx.import_session_id ?? null,
      tx.is_transfer ?? 0, tx.cleared ?? 1
    ]))

export const updateTransaction = (id, fields) => {
  const cols = Object.keys(fields).map(k => `${k}=?`).join(',')
  run(`UPDATE transactions SET ${cols} WHERE id=?`, [...Object.values(fields), id])
}

export const deleteTransaction = (id) =>
  run('DELETE FROM transactions WHERE id=?', [id])

export const getSpendingByCategory = ({ startDate, endDate } = {}) => {
  const conditions = ["t.amount < 0"]
  const params = []
  if (startDate) { conditions.push('t.date>=?'); params.push(startDate) }
  if (endDate)   { conditions.push('t.date<=?'); params.push(endDate) }
  return query(`
    SELECT c.id, c.name, c.icon, c.color,
           SUM(ABS(t.amount)) as total,
           COUNT(*) as count
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY c.id
    ORDER BY total DESC
  `, params)
}

export const getMonthlyTotals = (months = 12) =>
  query(`
    SELECT strftime('%Y-%m', date) as month,
           SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
           SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)       as income
    FROM transactions
    WHERE date >= date('now', '-${months} months')
    GROUP BY month
    ORDER BY month
  `)

// Duplicate detection: same account, date, amount, description
export const findDuplicates = (accountId, date, amount, description) =>
  query(`SELECT id FROM transactions
         WHERE account_id=? AND date=? AND amount=? AND description=?
         LIMIT 1`,
    [accountId, date, amount, description])
