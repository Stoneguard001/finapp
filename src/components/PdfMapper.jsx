import { useState, useMemo } from 'react'

const ROLES = ['skip', 'date', 'description', 'amount', 'debit', 'credit']
const ROLE_LABELS = { skip: 'Skip', date: 'Date', description: 'Description', amount: 'Amount', debit: 'Debit', credit: 'Credit' }
const ROLE_COLORS = {
  skip: 'text-slate-600',
  date: 'text-yellow-400',
  description: 'text-blue-400',
  amount: 'text-green-400',
  debit: 'text-red-400',
  credit: 'text-emerald-400',
}

export default function PdfMapper({ grid, numCols, onMapped }) {
  const [roles, setRoles] = useState(() => Array(numCols).fill('skip'))
  const [firstRow, setFirstRow] = useState(0)

  function setRole(colIdx, role) {
    setRoles(prev => prev.map((r, i) => {
      if (i === colIdx) return role
      // Clear any other column that had this role (only one column per role)
      if (role !== 'skip' && r === role) return 'skip'
      return r
    }))
  }

  const canApply = roles.includes('date') &&
    (roles.includes('amount') || roles.includes('debit') || roles.includes('credit'))

  const preview = useMemo(() => {
    if (!canApply) return []
    return grid.slice(firstRow, firstRow + 5)
      .map(row => parseRow(row, roles))
      .filter(Boolean)
  }, [roles, firstRow, grid, canApply])

  function handleApply() {
    const rows = grid.slice(firstRow)
      .map(row => parseRow(row, roles))
      .filter(r => r && r.date && r.amount != null)
    onMapped(rows)
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Assign each column a role using the dropdowns. Click any row to mark it as the first data row (to skip headers).
      </p>

      <div className="card p-0 overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2 text-left text-xs text-slate-500 w-8">#</th>
              {Array.from({ length: numCols }, (_, i) => (
                <th key={i} className="px-3 py-2 text-left min-w-[130px]">
                  <select
                    className="input text-xs py-1 w-full"
                    value={roles[i]}
                    onChange={e => setRole(i, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.slice(0, 60).map((row, ri) => (
              <tr
                key={ri}
                onClick={() => setFirstRow(ri)}
                title="Click to set as first data row"
                className={`border-b border-slate-800/50 cursor-pointer transition-colors
                  ${ri < firstRow ? 'opacity-25' : 'hover:bg-slate-800/30'}
                  ${ri === firstRow ? 'bg-brand-900/20 ring-1 ring-inset ring-brand-700/50' : ''}`}
              >
                <td className="px-3 py-1.5 text-slate-600 text-xs">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate text-xs
                      ${ROLE_COLORS[roles[ci]]}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        First data row: <span className="text-slate-300 font-medium">row {firstRow + 1}</span>
        {firstRow > 0 && <span className="text-slate-600"> ({firstRow} header row{firstRow > 1 ? 's' : ''} skipped)</span>}
      </p>

      {preview.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</p>
          <div className="space-y-1.5">
            {preview.map((r, i) => (
              <div key={i} className="flex gap-4 text-sm">
                <span className="text-slate-500 w-24 shrink-0">{r.date}</span>
                <span className="text-slate-200 flex-1 truncate">{r.description || <em className="text-slate-600">no description</em>}</span>
                <span className={`font-mono shrink-0 ${r.amount >= 0 ? 'text-brand-400' : 'text-slate-300'}`}>
                  {r.amount != null ? (r.amount >= 0 ? '+' : '') + r.amount.toFixed(2) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary" disabled={!canApply} onClick={handleApply}>
        Continue to Preview →
      </button>
    </div>
  )
}

function parseRow(row, roles) {
  const dateCol   = roles.indexOf('date')
  const descCol   = roles.indexOf('description')
  const amountCol = roles.indexOf('amount')
  const debitCol  = roles.indexOf('debit')
  const creditCol = roles.indexOf('credit')

  const rawDate = dateCol >= 0 ? row[dateCol]?.trim() : ''
  if (!rawDate || !isDateLike(rawDate)) return null

  let amount = null
  if (amountCol >= 0 && row[amountCol]?.trim()) {
    const raw = row[amountCol].trim().replace(/[$,\s]/g, '')
    const isNeg = raw.startsWith('(') || raw.startsWith('-')
    const n = parseFloat(raw.replace(/[()]/g, ''))
    if (!isNaN(n)) amount = isNeg ? -Math.abs(n) : Math.abs(n)
  } else if (debitCol >= 0 || creditCol >= 0) {
    const d = debitCol >= 0 ? parseFloat((row[debitCol] || '').replace(/[$,\s]/g, '')) || 0 : 0
    const c = creditCol >= 0 ? parseFloat((row[creditCol] || '').replace(/[$,\s]/g, '')) || 0 : 0
    if (d || c) amount = c - d
  }
  if (amount == null) return null

  const description = (descCol >= 0 ? row[descCol] : '').trim()
  const date = normalizeDate(rawDate)
  if (!date) return null
  return { date, description, payee: description, amount }
}

function isDateLike(s) {
  return /\d{1,4}[\/\-]\d{1,2}([\/\-]\d{2,4})?/.test(s)
}

function normalizeDate(raw) {
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[\/\-]/)
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`
    const year = c < 100 ? c + 2000 : c
    return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
  }
  if (parts.length === 2) {
    const [m, d] = parts.map(Number)
    return `${new Date().getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}
