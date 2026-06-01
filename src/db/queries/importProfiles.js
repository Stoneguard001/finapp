import { query, run } from '@/db/database'

export const getAccountImportProfile = (accountId) =>
  query('SELECT * FROM account_import_profiles WHERE account_id=?', [accountId])[0] ?? null

export const saveAccountImportProfile = (accountId, mapping) =>
  run(
    `INSERT INTO account_import_profiles (account_id, col_date, col_desc, col_amount, col_debit, col_credit, col_payee, negate)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(account_id) DO UPDATE SET
       col_date=excluded.col_date, col_desc=excluded.col_desc,
       col_amount=excluded.col_amount, col_debit=excluded.col_debit,
       col_credit=excluded.col_credit, col_payee=excluded.col_payee,
       negate=excluded.negate, updated_at=datetime('now')`,
    [accountId, mapping.col_date, mapping.col_desc,
     mapping.col_amount ?? null, mapping.col_debit ?? null,
     mapping.col_credit ?? null, mapping.col_payee ?? null,
     mapping.negate ? 1 : 0]
  )

export function profileHeadersMatch(headers, profile) {
  const set = new Set(headers)
  return set.has(profile.col_date) &&
         set.has(profile.col_desc) &&
         (set.has(profile.col_amount) || set.has(profile.col_debit) || set.has(profile.col_credit))
}
