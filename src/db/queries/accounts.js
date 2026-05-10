import { query, run } from '../database'

export const getAccounts = () =>
  query('SELECT * FROM accounts WHERE archived=0 ORDER BY name')

export const getAccount = (id) =>
  query('SELECT * FROM accounts WHERE id=?', [id])[0] ?? null

export const createAccount = ({ name, institution = '', type = 'checking', currency = 'USD', color = '#22c55e' }) =>
  run('INSERT INTO accounts (name,institution,type,currency,color) VALUES (?,?,?,?,?)',
    [name, institution, type, currency, color])

export const updateAccount = (id, fields) => {
  const cols = Object.keys(fields).map(k => `${k}=?`).join(',')
  run(`UPDATE accounts SET ${cols} WHERE id=?`, [...Object.values(fields), id])
}

export const archiveAccount = (id) =>
  run('UPDATE accounts SET archived=1 WHERE id=?', [id])
