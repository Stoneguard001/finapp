import { useState, useMemo, useEffect } from 'react'
import { BarChart2, TrendingUp, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useDbStore } from '@/store/dbStore'
import { query } from '@/db/database'
import { useQuery } from '@/hooks/useQuery'
import { useCurrency } from '@/context/CurrencyContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'

// ── Date helpers ───────────────────────────────────────────────────────
function monthRange(startYM, endYM) {
  const months = []
  let [y, m] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return months.slice(0, 24)
}

function ymLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function endOfMonthStr(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${new Date(y, m, 0).getDate()}`
}

function defaultRange() {
  const now = new Date()
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const s = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const start = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`
  return { start, end }
}

const MONTH_OPTIONS = (() => {
  const opts = []
  const now = new Date()
  for (let i = -35; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    opts.push({
      value: ym,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }
  return opts
})()

function monthlyEquiv(amount, period) {
  const map = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, semi_annual: 1 / 6, annual: 1 / 12 }
  return amount * (map[period] ?? 1)
}

// ── Data fetchers ──────────────────────────────────────────────────────
function fetchCategories(startYM, endYM, viewType) {
  const startDate = `${startYM}-01`
  const endDate   = endOfMonthStr(endYM)

  // Mirror getSpendingByCategory: non-split transactions UNION split portions
  const rows = query(`
    SELECT sub.category_id AS id, c.name, c.color, sub.month,
      SUM(CASE WHEN sub.amount < 0 THEN ABS(sub.amount) ELSE 0 END) AS spending,
      SUM(CASE WHEN sub.amount > 0 THEN sub.amount        ELSE 0 END) AS income,
      SUM(sub.amount)                                                  AS net
    FROM (
      SELECT t.category_id, strftime('%Y-%m', t.date) AS month, t.amount
      FROM transactions t
      WHERE t.is_transfer = 0 AND t.date >= ? AND t.date <= ?
        AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id)
      UNION ALL
      SELECT ts.category_id, strftime('%Y-%m', t.date) AS month, ts.amount
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE t.is_transfer = 0 AND t.date >= ? AND t.date <= ?
    ) sub
    JOIN categories c ON c.id = sub.category_id
    WHERE sub.category_id IS NOT NULL
    GROUP BY sub.category_id, sub.month
    ORDER BY c.name, sub.month
  `, [startDate, endDate, startDate, endDate])

  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, color: r.color, data: {} })
    const v = viewType === 'income' ? r.income : viewType === 'net' ? r.net : r.spending
    map.get(r.id).data[r.month] = v ?? 0
  }
  return [...map.values()]
}

function fetchBudgets(startYM, endYM) {
  const startDate = `${startYM}-01`
  const endDate   = endOfMonthStr(endYM)

  const budgets = query(`
    SELECT b.id, b.name, b.amount, b.period, b.start_date, b.end_date,
           b.category_id, c.color
    FROM budgets b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.archived = 0
    ORDER BY b.name, b.start_date
  `)

  if (budgets.length === 0) return []

  // Only count transactions explicitly assigned to a budget via budget_item_id.
  // The UNION handles non-split transactions and split portions separately so
  // neither path double-counts the other.
  const actuals = query(`
    SELECT b.id AS budget_id,
           strftime('%Y-%m', sub.date) AS month,
           SUM(ABS(sub.amount)) AS actual
    FROM budgets b
    JOIN (
      SELECT t.date, t.amount, t.budget_item_id
      FROM transactions t
      WHERE t.amount < 0 AND t.is_transfer = 0
        AND t.date >= ? AND t.date <= ?
        AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id)
      UNION ALL
      SELECT t.date, ts.amount, ts.budget_item_id
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.amount < 0 AND t.is_transfer = 0
        AND t.date >= ? AND t.date <= ?
    ) sub ON sub.budget_item_id = b.id
    WHERE b.archived = 0
    GROUP BY b.id, month
  `, [startDate, endDate, startDate, endDate])

  const aMap = new Map()
  for (const a of actuals) {
    if (!aMap.has(a.budget_id)) aMap.set(a.budget_id, {})
    aMap.get(a.budget_id)[a.month] = a.actual
  }

  // Group rows that share the same name into one logical budget.
  // This handles a budget renewed with a new date range or updated amount —
  // it should appear as a single row in the report.
  const groups = new Map()
  for (const b of budgets) {
    if (!groups.has(b.name)) groups.set(b.name, { name: b.name, color: b.color, rows: [] })
    groups.get(b.name).rows.push(b)
  }

  const months = monthRange(startYM, endYM)

  return [...groups.values()].map(({ name, color, rows }) => {
    // For each month in the report, find which date-range row applies and use
    // its amount as the target. If multiple rows overlap, pick the latest start.
    const monthlyTargets = {}
    for (const ym of months) {
      const mStart = `${ym}-01`
      const mEnd   = endOfMonthStr(ym)
      const applicable = rows.filter(b =>
        b.start_date <= mEnd && (!b.end_date || b.end_date >= mStart)
      )
      if (applicable.length > 0) {
        const latest = applicable.reduce((best, b) =>
          b.start_date > best.start_date ? b : best
        )
        monthlyTargets[ym] = monthlyEquiv(latest.amount, latest.period)
      }
    }

    // Aggregate actuals from every budget ID in this logical group.
    const data = {}
    for (const b of rows) {
      for (const [month, amt] of Object.entries(aMap.get(b.id) ?? {})) {
        data[month] = (data[month] ?? 0) + amt
      }
    }

    // Representative target for the label: whichever row is active today,
    // falling back to the last row if none are currently active.
    const today = new Date().toISOString().slice(0, 10)
    const nowActive = rows.filter(b => b.start_date <= today && (!b.end_date || b.end_date >= today))
    const repRow = nowActive.length > 0
      ? nowActive.reduce((best, b) => b.start_date > best.start_date ? b : best)
      : rows[rows.length - 1]

    return {
      id:            name,
      name,
      color:         color || '#64748b',
      monthlyTarget: monthlyEquiv(repRow.amount, repRow.period),
      monthlyTargets,
      data,
    }
  })
}

function fetchTags(startYM, endYM) {
  const rows = query(`
    SELECT tg.id, tg.name, tg.color,
      strftime('%Y-%m', t.date) AS month,
      SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS spending
    FROM tags tg
    JOIN transaction_tags tt ON tt.tag_id = tg.id
    JOIN transactions t ON t.id = tt.transaction_id
    WHERE t.date >= ? AND t.date <= ? AND t.is_transfer = 0
    GROUP BY tg.id, month
    ORDER BY tg.name, month
  `, [`${startYM}-01`, endOfMonthStr(endYM)])

  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, color: r.color, data: {} })
    map.get(r.id).data[r.month] = r.spending ?? 0
  }
  return [...map.values()]
}

// ── Helpers ────────────────────────────────────────────────────────────
function hexAlpha(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(100,116,139,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const REPORT_TYPES = [
  { value: 'categories', label: 'Categories' },
  { value: 'budgets',    label: 'Budgets' },
  { value: 'tags',       label: 'Tags' },
]

const VIEW_TYPES = [
  { value: 'spending', label: 'Spending' },
  { value: 'income',   label: 'Income' },
  { value: 'net',      label: 'Net' },
]

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b',
]

// ── Main Component ─────────────────────────────────────────────────────
export default function Reports() {
  const ready = useDbStore(s => s.ready)
  const { fmt } = useCurrency()

  const { start: defStart, end: defEnd } = useMemo(defaultRange, [])
  const [reportType, setReportType] = useState('categories')
  const [viewType, setViewType]     = useState('spending')
  const [startYM, setStartYM]       = useState(defStart)
  const [endYM, setEndYM]           = useState(defEnd)
  const [showChart, setShowChart]   = useState(false)

  // Seed range from the actual latest transaction so the page isn't empty
  // when the user's data predates today's calendar window.
  useEffect(() => {
    if (!ready) return
    try {
      const maxDate = query('SELECT MAX(date) AS maxDate FROM transactions')[0]?.maxDate
      if (maxDate) {
        const maxYM = maxDate.slice(0, 7)
        const [y, m] = maxYM.split('-').map(Number)
        const s = new Date(y, m - 6, 1)
        const start = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`
        setEndYM(maxYM)
        setStartYM(start)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const months = useMemo(() => monthRange(startYM, endYM), [startYM, endYM])

  const { data: rows = [] } = useQuery(() => {
    if (!ready) return []
    if (reportType === 'categories') return fetchCategories(startYM, endYM, viewType)
    if (reportType === 'budgets')    return fetchBudgets(startYM, endYM)
    if (reportType === 'tags')       return fetchTags(startYM, endYM)
    return []
  }, [ready, reportType, startYM, endYM, viewType])

  const rowStats = useMemo(() => rows.map(row => {
    const vals = months.map(m => row.data[m] ?? 0)
    const total = vals.reduce((s, v) => s + v, 0)
    return { total, avg: months.length ? total / months.length : 0 }
  }), [rows, months])

  const colTotals = useMemo(() => {
    const t = {}
    for (const m of months) t[m] = rows.reduce((s, r) => s + (r.data[m] ?? 0), 0)
    return t
  }, [rows, months])

  const grandTotal = useMemo(() => Object.values(colTotals).reduce((s, v) => s + v, 0), [colTotals])

  const rowMaxes = useMemo(
    () => rows.map(row => Math.max(...months.map(m => Math.abs(row.data[m] ?? 0)), 0.01)),
    [rows, months]
  )

  const chartData = useMemo(() => {
    if (!showChart || rows.length === 0) return []
    return months.map(m => {
      const pt = { month: ymLabel(m) }
      for (const row of rows.slice(0, 8)) pt[row.name] = row.data[m] ?? 0
      return pt
    })
  }, [showChart, months, rows])

  const handleStartChange = e => { if (e.target.value <= endYM) setStartYM(e.target.value) }
  const handleEndChange   = e => { if (e.target.value >= startYM) setEndYM(e.target.value) }

  function exportCsv() {
    const label = reportType === 'categories' ? 'Category' : reportType === 'budgets' ? 'Budget Item' : 'Tag'
    const headers = [label, ...months.map(ymLabel), 'Total', 'Avg/Mo']
    const dataRows = rows.map((row, i) => {
      const { total, avg } = rowStats[i]
      return [row.name, ...months.map(m => (row.data[m] ?? 0).toFixed(2)), total.toFixed(2), avg.toFixed(2)]
    })
    const footer = [
      'Total',
      ...months.map(m => (colTotals[m] ?? 0).toFixed(2)),
      grandTotal.toFixed(2),
      (months.length ? grandTotal / months.length : 0).toFixed(2),
    ]
    const csv = [headers, ...dataRows, footer]
      .map(row => row.map(cell => {
        const s = String(cell)
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportType}-${startYM}-to-${endYM}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const emptyMsg = reportType === 'budgets'
    ? 'Create budgets and split transactions to see actuals here.'
    : `Add transactions with ${reportType} assigned to see data here.`

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 size={22} className="text-brand-600 dark:text-brand-400 shrink-0" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Reports</h1>
      </div>

      <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
        Note: This section is new and still working out a few kinks.
      </p>

      {/* Controls */}
      <div className="card flex flex-wrap items-center gap-3">
        {/* Report type */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-medium">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={`px-3 py-1.5 transition-colors
                ${reportType === rt.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* View type (not applicable for budgets) */}
        {reportType !== 'budgets' && (
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-medium">
            {VIEW_TYPES.map(vt => (
              <button
                key={vt.value}
                onClick={() => setViewType(vt.value)}
                className={`px-3 py-1.5 transition-colors
                  ${viewType === vt.value
                    ? 'bg-slate-700 dark:bg-slate-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {vt.label}
              </button>
            ))}
          </div>
        )}

        {/* Date range selectors */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <span className="text-sm text-slate-500 dark:text-slate-400">From</span>
          <select value={startYM} onChange={handleStartChange} className="input text-sm !w-auto">
            {MONTH_OPTIONS.map(o => (
              <option key={o.value} value={o.value} disabled={o.value > endYM}>{o.label}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500 dark:text-slate-400">to</span>
          <select value={endYM} onChange={handleEndChange} className="input text-sm !w-auto">
            {MONTH_OPTIONS.map(o => (
              <option key={o.value} value={o.value} disabled={o.value < startYM}>{o.label}</option>
            ))}
          </select>
          {rows.length > 0 && (
            <button
              onClick={exportCsv}
              className="btn-ghost p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Export to CSV"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table / Empty state */}
      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No data for the selected range.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{emptyMsg}</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/50 text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[180px] border-b border-r border-slate-200 dark:border-slate-700">
                    {reportType === 'categories' ? 'Category' : reportType === 'budgets' ? 'Budget Item' : 'Tag'}
                  </th>
                  {months.map(m => (
                    <th key={m} className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[96px] border-b border-slate-200 dark:border-slate-700">
                      {ymLabel(m)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 min-w-[96px] border-b border-l border-slate-200 dark:border-slate-700">
                    Total
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 min-w-[96px] border-b border-slate-200 dark:border-slate-700">
                    Avg/Mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const { total, avg } = rowStats[i]
                  const rowMax = rowMaxes[i]
                  return (
                    <tr
                      key={row.id}
                      className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Label cell */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/30 px-4 py-2.5 border-b border-r border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color || '#64748b' }} />
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[148px]">{row.name}</span>
                        </div>
                        {reportType === 'budgets' && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 pl-[18px] mt-0.5">
                            Target {fmt(row.monthlyTarget)}/mo
                          </div>
                        )}
                      </td>

                      {/* Month cells */}
                      {months.map(m => {
                        const val = row.data[m] ?? 0
                        const alpha = rowMax > 0 ? (Math.abs(val) / rowMax) * 0.18 : 0
                        let bgStyle = { backgroundColor: val !== 0 ? hexAlpha(row.color, alpha) : 'transparent' }
                        let valCls  = 'text-slate-700 dark:text-slate-300'
                        let subtext = null

                        if (reportType === 'budgets' && val > 0) {
                          const target = row.monthlyTargets?.[m] ?? row.monthlyTarget
                          const pct = target > 0 ? val / target : 0
                          const over = pct > 1.05
                          bgStyle = { backgroundColor: over ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.09)' }
                          valCls  = over ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-700 dark:text-emerald-400'
                          subtext = (
                            <div className="mt-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(pct * 100, 100)}%` }}
                              />
                            </div>
                          )
                        }

                        return (
                          <td key={m} className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800" style={bgStyle}>
                            <div className="text-right">
                              {val === 0
                                ? <span className="text-slate-300 dark:text-slate-600">—</span>
                                : <span className={valCls}>{fmt(val)}</span>
                              }
                            </div>
                            {subtext}
                          </td>
                        )
                      })}

                      {/* Total */}
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200 border-b border-l border-slate-200 dark:border-slate-700">
                        {total === 0 ? <span className="text-slate-300 dark:text-slate-600">—</span> : fmt(total)}
                      </td>
                      {/* Avg */}
                      <td className="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        {avg === 0 ? <span className="text-slate-300 dark:text-slate-600">—</span> : fmt(avg)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-700 dark:text-slate-300 border-t-2 border-r border-slate-300 dark:border-slate-600">
                    Total
                  </td>
                  {months.map(m => (
                    <td key={m} className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 border-t-2 border-slate-300 dark:border-slate-600">
                      {colTotals[m] === 0 ? <span className="text-slate-300 dark:text-slate-600">—</span> : fmt(colTotals[m])}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 border-t-2 border-l border-slate-300 dark:border-slate-600">
                    {fmt(grandTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400 border-t-2 border-slate-300 dark:border-slate-600">
                    {months.length ? fmt(grandTotal / months.length) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Trend Chart (collapsible) */}
      {rows.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setShowChart(c => !c)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <TrendingUp size={16} />
              Trend Chart
              {!showChart && <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(click to expand)</span>}
            </span>
            {showChart ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showChart && (
            <div className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} width={76} />
                  <Tooltip formatter={(val, name) => [fmt(val), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rows.slice(0, 8).map((row, i) => (
                    <Line
                      key={row.id}
                      type="monotone"
                      dataKey={row.name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {rows.length > 8 && (
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1">
                  Showing 8 of {rows.length} items in chart.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
