import { query, run, runMany } from '../database'

// char(31) = unit separator, char(30) = record separator — safe delimiters for tag encoding
const parseTags = row => ({
  ...row,
  tags: row.tags_raw
    ? row.tags_raw.split('\x1E').map(s => {
        const [id, name, color] = s.split('\x1F')
        return { id: Number(id), name, color }
      })
    : []
})

export const getTransactions = ({ accountId, categoryId, tagId, startDate, endDate, limit = 500, offset = 0 } = {}) => {
  const conditions = []
  const params = []
  if (accountId)  { conditions.push('t.account_id=?');  params.push(accountId) }
  if (categoryId) { conditions.push('t.category_id=?'); params.push(categoryId) }
  if (tagId)      { conditions.push('EXISTS (SELECT 1 FROM transaction_tags WHERE transaction_id=t.id AND tag_id=?)'); params.push(tagId) }
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
           c.color as category_color,
           b.name   as budget_item_name,
           b.period as budget_item_period,
           bc.color as budget_item_color,
           CASE WHEN t.budget_item_id IS NULL THEN (
             SELECT ib.name FROM budgets ib
             WHERE ib.category_id = t.category_id
               AND ib.archived = 0
               AND ib.start_date <= t.date
               AND (ib.end_date IS NULL OR ib.end_date >= t.date)
             ORDER BY ib.start_date DESC LIMIT 1
           ) END as implied_budget_name,
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw
    FROM transactions t
    LEFT JOIN accounts        a  ON a.id  = t.account_id
    LEFT JOIN categories      c  ON c.id  = t.category_id
    LEFT JOIN budgets          b  ON b.id  = t.budget_item_id
    LEFT JOIN categories      bc ON bc.id = b.category_id
    LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
    LEFT JOIN tags            tg ON tg.id = tt.tag_id
    ${where}
    GROUP BY t.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `, params).map(parseTags)
}

export const getTransaction = (id) => {
  const row = query(`
    SELECT t.*, a.name as account_name, c.name as category_name,
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw
    FROM transactions t
    LEFT JOIN accounts        a  ON a.id  = t.account_id
    LEFT JOIN categories      c  ON c.id  = t.category_id
    LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
    LEFT JOIN tags            tg ON tg.id = tt.tag_id
    WHERE t.id=?
    GROUP BY t.id
  `, [id])[0]
  return row ? parseTags(row) : null
}

export const createTransaction = (tx) =>
  run(`INSERT INTO transactions
       (account_id,date,amount,description,payee,category_id,notes,import_session_id,is_transfer,cleared,budget_item_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [tx.account_id, tx.date, tx.amount, tx.description, tx.payee ?? null,
     tx.category_id ?? null, tx.notes ?? null, tx.import_session_id ?? null,
     tx.is_transfer ?? 0, tx.cleared ?? 1, tx.budget_item_id ?? null])

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
  const conditions = ["t.amount < 0", "t.is_transfer = 0", "LOWER(COALESCE(c.name,'')) != 'transfer'"]
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
    WHERE is_transfer = 0
      AND date >= date('now', '-${months} months')
    GROUP BY month
    ORDER BY month
  `)

export const getYearMonthlyTotals = (year) =>
  query(`
    SELECT strftime('%Y-%m', date) as month,
           SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
           SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)       as income
    FROM transactions
    WHERE is_transfer = 0
      AND strftime('%Y', date) = ?
    GROUP BY month
    ORDER BY month
  `, [String(year)])

export const findDuplicates = (accountId, date, amount, description) =>
  query(`SELECT id FROM transactions
         WHERE account_id=? AND date=? AND amount=? AND description=?
         LIMIT 1`,
    [accountId, date, amount, description])

// Matches same account/date/amount where either description contains the other (case-insensitive)
export const findFuzzyDuplicates = (accountId, date, amount, description) =>
  query(`SELECT id FROM transactions
         WHERE account_id=? AND date=? AND amount=?
           AND (
             LOWER(description) LIKE '%' || LOWER(?) || '%'
             OR LOWER(?) LIKE '%' || LOWER(description) || '%'
           )
         LIMIT 1`,
    [accountId, date, amount, description, description])
