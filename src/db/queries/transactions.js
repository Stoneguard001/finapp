import { query, run, runMany } from '../database'

// char(31) = unit separator, char(30) = record separator — safe delimiters for tag encoding
const parseRow = row => ({
  ...row,
  tags: row.tags_raw
    ? row.tags_raw.split('\x1E').map(s => {
        const [id, name, color] = s.split('\x1F')
        return { id: Number(id), name, color }
      })
    : [],
  split_category_ids: row.split_category_ids_raw
    ? row.split_category_ids_raw.split(',').map(Number)
    : []
})

export const getTransactions = ({ accountId, categoryId, tagId, startDate, endDate, limit = 500, offset = 0 } = {}) => {
  const conditions = []
  const params = []
  if (accountId)  { conditions.push('t.account_id=?');  params.push(accountId) }
  if (categoryId) {
    conditions.push('(t.category_id=? OR EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id=t.id AND category_id=?))')
    params.push(categoryId, categoryId)
  }
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
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw,
           (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as split_count,
           (SELECT GROUP_CONCAT(category_id) FROM transaction_splits WHERE transaction_id = t.id) as split_category_ids_raw
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
  `, params).map(parseRow)
}

export const getTransaction = (id) => {
  const row = query(`
    SELECT t.*, a.name as account_name, c.name as category_name,
           GROUP_CONCAT(tg.id || char(31) || tg.name || char(31) || tg.color, char(30)) as tags_raw,
           (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as split_count,
           (SELECT GROUP_CONCAT(category_id) FROM transaction_splits WHERE transaction_id = t.id) as split_category_ids_raw
    FROM transactions t
    LEFT JOIN accounts        a  ON a.id  = t.account_id
    LEFT JOIN categories      c  ON c.id  = t.category_id
    LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
    LEFT JOIN tags            tg ON tg.id = tt.tag_id
    WHERE t.id=?
    GROUP BY t.id
  `, [id])[0]
  return row ? parseRow(row) : null
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

// ── Split queries ─────────────────────────────────────────────────────────────

export const getTransactionSplits = (transactionId) =>
  query(`
    SELECT ts.*,
           c.name  as category_name,
           c.icon  as category_icon,
           c.color as category_color,
           b.name  as budget_item_name,
           b.period as budget_item_period
    FROM transaction_splits ts
    LEFT JOIN categories c ON c.id = ts.category_id
    LEFT JOIN budgets     b ON b.id = ts.budget_item_id
    WHERE ts.transaction_id = ?
    ORDER BY ts.sort_order, ts.id
  `, [transactionId])

export const setTransactionSplits = (transactionId, splits) => {
  run('DELETE FROM transaction_splits WHERE transaction_id=?', [transactionId])
  if (splits.length === 0) return
  runMany(
    'INSERT INTO transaction_splits (transaction_id, category_id, budget_item_id, amount, note, sort_order) VALUES (?,?,?,?,?,?)',
    splits.map((s, i) => [transactionId, s.category_id ?? null, s.budget_item_id ?? null, s.amount, s.note ?? null, i])
  )
}

export const getSplitsForDateRange = ({ startDate, endDate } = {}) => {
  const conditions = ['t.is_transfer = 0']
  const params = []
  if (startDate) { conditions.push('t.date>=?'); params.push(startDate) }
  if (endDate)   { conditions.push('t.date<=?'); params.push(endDate) }
  return query(`
    SELECT ts.category_id, ts.budget_item_id, ts.amount,
           ts.transaction_id, ts.sort_order,
           b.period as budget_item_period,
           t.date, t.description,
           c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    LEFT JOIN budgets b ON b.id = ts.budget_item_id
    LEFT JOIN categories c ON c.id = ts.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ts.transaction_id, ts.sort_order, ts.id
  `, params)
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getSpendingByCategory = ({ startDate, endDate } = {}) => {
  const dateConds = []
  const dateParams = []
  if (startDate) { dateConds.push('t.date>=?'); dateParams.push(startDate) }
  if (endDate)   { dateConds.push('t.date<=?'); dateParams.push(endDate) }
  const dateClause = dateConds.length ? ` AND ${dateConds.join(' AND ')}` : ''

  return query(`
    SELECT c.id, c.name, c.icon, c.color,
           SUM(ABS(sub.amount)) as total,
           COUNT(*) as count
    FROM (
      SELECT t.amount, t.category_id
      FROM transactions t
      WHERE t.amount < 0
        AND t.is_transfer = 0
        AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id)
        ${dateClause}
      UNION ALL
      SELECT ts.amount, ts.category_id
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.amount < 0
        AND t.is_transfer = 0
        ${dateClause}
    ) sub
    LEFT JOIN categories c ON c.id = sub.category_id
    WHERE LOWER(COALESCE(c.name, '')) != 'transfer'
    GROUP BY c.id
    ORDER BY total DESC
  `, [...dateParams, ...dateParams])
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
