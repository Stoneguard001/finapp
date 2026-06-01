import { useState, useMemo } from 'react'

const ROLES = ['skip', 'date', 'description', 'amount', 'debit', 'credit', 'payee']
const ROLE_LABELS = { skip: 'Skip', date: 'Date', description: 'Description', amount: 'Amount', debit: 'Debit', credit: 'Credit', payee: 'Payee' }
const ROLE_COLORS = {
  skip:        'text-slate-400 dark:text-slate-600',
  date:        'text-yellow-500 dark:text-yellow-400',
  description: 'text-blue-500 dark:text-blue-400',
  amount:      'text-green-500 dark:text-green-400',
  debit:       'text-red-500 dark:text-red-400',
  credit:      'text-emerald-500 dark:text-emerald-400',
  payee:       'text-purple-500 dark:text-purple-400',
}

export default function ColumnMapper({ headers, rawRows, savedProfile = null, onConfirm }) {
  const [roles, setRoles] = useState(() => initRoles(headers, savedProfile))
  const [negate, setNegate] = useState(savedProfile ? savedProfile.negate === 1 : false)

  function setRole(header, role) {
    setRoles(prev => {
      const next = { ...prev, [header]: role }
      // Ensure only one column per role
      if (role !== 'skip') {
        for (const h of headers) {
          if (h !== header && next[h] === role) next[h] = 'skip'
        }
      }
      return next
    })
  }

  const canConfirm = useMemo(() => {
    const vals = Object.values(roles)
    return vals.includes('date') &&
           vals.includes('description') &&
           (vals.includes('amount') || vals.includes('debit') || vals.includes('credit'))
  }, [roles])

  const preview = useMemo(() => {
    if (!canConfirm) return []
    const mapping = buildMapping(headers, roles, negate)
    return rawRows.slice(0, 5).map(row => previewRow(row, mapping)).filter(Boolean)
  }, [roles, negate, rawRows, headers, canConfirm])

  function handleConfirm() {
    onConfirm(buildMapping(headers, roles, negate))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Assign each column a role. This mapping will be saved for future imports to this account.
      </p>

      <div className="card p-0 overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {headers.map(h => (
                <th key={h} className="px-3 py-2 text-left min-w-[140px] align-bottom">
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-1.5 truncate" title={h}>{h}</div>
                  <select
                    className="input text-xs py-1 w-full"
                    value={roles[h] ?? 'skip'}
                    onChange={e => setRole(h, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawRows.slice(0, 8).map((row, ri) => (
              <tr key={ri} className="border-b border-slate-200/50 dark:border-slate-800/50">
                {headers.map(h => (
                  <td key={h} className={`px-3 py-1.5 text-xs whitespace-nowrap max-w-[200px] truncate ${ROLE_COLORS[roles[h] ?? 'skip']}`}>
                    {row[h] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
        <input type="checkbox" className="rounded" checked={negate} onChange={e => setNegate(e.target.checked)} />
        Negate amounts
        <span className="text-slate-400 dark:text-slate-600 text-xs">(expenses are positive in this file)</span>
      </label>

      {preview.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</p>
          <div className="space-y-1.5">
            {preview.map((r, i) => (
              <div key={i} className="flex gap-4 text-sm">
                <span className="text-slate-500 dark:text-slate-400 w-24 shrink-0">{r.date}</span>
                <span className="text-slate-800 dark:text-slate-200 flex-1 truncate">
                  {r.description || <em className="text-slate-400 dark:text-slate-600">no description</em>}
                </span>
                <span className={`font-mono shrink-0 ${r.amount >= 0 ? 'text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {(r.amount >= 0 ? '+' : '') + r.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
        Continue to Preview →
      </button>
    </div>
  )
}

function initRoles(headers, savedProfile) {
  const roles = {}
  if (savedProfile) {
    for (const h of headers) roles[h] = 'skip'
    const assign = (col, role) => { if (col && headers.includes(col)) roles[col] = role }
    assign(savedProfile.col_date,   'date')
    assign(savedProfile.col_desc,   'description')
    assign(savedProfile.col_amount, 'amount')
    assign(savedProfile.col_debit,  'debit')
    assign(savedProfile.col_credit, 'credit')
    assign(savedProfile.col_payee,  'payee')
    return roles
  }
  // Auto-guess from header names
  const taken = new Set()
  for (const h of headers) {
    const hl = h.toLowerCase()
    let role = 'skip'
    if (!taken.has('date')        && /\bdate\b/.test(hl))                           role = 'date'
    else if (!taken.has('description') && /desc|memo|note|narr|detail|ref/.test(hl)) role = 'description'
    else if (!taken.has('amount') && /^(amount|amt)$/.test(hl))                     role = 'amount'
    else if (!taken.has('debit')  && /debit|withdrawal|charged/.test(hl))           role = 'debit'
    else if (!taken.has('credit') && /credit|deposit/.test(hl))                     role = 'credit'
    else if (!taken.has('payee')  && /payee|vendor|merchant/.test(hl))              role = 'payee'
    if (role !== 'skip') taken.add(role)
    roles[h] = role
  }
  return roles
}

function buildMapping(headers, roles, negate) {
  return {
    col_date:   headers.find(h => roles[h] === 'date')        ?? null,
    col_desc:   headers.find(h => roles[h] === 'description') ?? null,
    col_amount: headers.find(h => roles[h] === 'amount')      ?? null,
    col_debit:  headers.find(h => roles[h] === 'debit')       ?? null,
    col_credit: headers.find(h => roles[h] === 'credit')      ?? null,
    col_payee:  headers.find(h => roles[h] === 'payee')       ?? null,
    negate:     negate ? 1 : 0,
  }
}

function previewRow(row, mapping) {
  const date = normalizeDate(row[mapping.col_date] ?? '')
  if (!date) return null
  const description = String(row[mapping.col_desc] ?? '').trim()

  let amount
  if (mapping.col_amount) {
    amount = parseAmount(row[mapping.col_amount])
  } else {
    const debit  = mapping.col_debit  ? (parseAmount(row[mapping.col_debit])  || 0) : 0
    const credit = mapping.col_credit ? (parseAmount(row[mapping.col_credit]) || 0) : 0
    amount = credit - debit
  }
  if (isNaN(amount)) return null
  if (mapping.negate) amount = -amount
  return { date, description, amount }
}

function parseAmount(val) {
  if (val === null || val === undefined || val === '') return NaN
  const s = String(val).trim()
  const negative = s.startsWith('(') && s.endsWith(')')
  const n = parseFloat(s.replace(/[$,\s()]/g, ''))
  return negative ? -n : n
}

function normalizeDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[\/\-\.]/)
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    const year = c < 100 ? c + 2000 : c
    return `${year}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}
