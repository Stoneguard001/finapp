import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { getTransactions, deleteTransaction } from '@/db/queries/transactions'
import { getCategories } from '@/db/queries/categories'
import { getAccounts } from '@/db/queries/accounts'
import { getTags } from '@/db/queries/tags'
import { useQuery } from '@/hooks/useQuery'
import { fmt, fmtDate } from '@/lib/fmt'
import CategoryBadge from '@/components/CategoryBadge'
import YearPicker from '@/components/YearPicker'
import TransactionModal from '@/components/transactions/TransactionModal'

export default function Transactions() {
  const [searchParams] = useSearchParams()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // URL param takes priority (e.g. navigating here from the dashboard)
    const m = searchParams.get('month')
    if (m) {
      const [y, mo] = m.split('-').map(Number)
      return new Date(y, mo - 1, 1)
    }
    const stored = localStorage.getItem('txn_selectedMonth')
    return stored ? new Date(stored) : new Date()
  })
  const [viewMode, setViewMode]     = useState(() => localStorage.getItem('txn_viewMode') ?? 'month')
  const [selectedYear, setSelectedYear] = useState(() => Number(localStorage.getItem('txn_selectedYear')) || new Date().getFullYear())
  const [search, setSearch]               = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get('category') ?? '')
  const [filterTag, setFilterTag]         = useState(null)
  const [editing, setEditing]             = useState(null)
  const [refresh, setRefresh]             = useState(0)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const isCurrentMonth = isSameMonth(selectedMonth, new Date())
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(selectedMonth),   'yyyy-MM-dd')

  const startDate = viewMode === 'year' ? `${selectedYear}-01-01` : monthStart
  const endDate   = viewMode === 'year' ? `${selectedYear}-12-31` : monthEnd
  const fetchLimit = viewMode === 'year' ? 5000 : 2000

  const { data: transactions = [] } = useQuery(
    () => getTransactions({ startDate, endDate, limit: fetchLimit }),
    [startDate, endDate, refresh]
  )

  function changeMonth(updater) {
    setSelectedMonth(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('txn_selectedMonth', next.toISOString())
      return next
    })
  }

  function changeYear(year) {
    setSelectedYear(year)
    localStorage.setItem('txn_selectedYear', String(year))
  }

  function switchMode(mode) {
    if (mode === 'year') changeYear(selectedMonth.getFullYear())
    setViewMode(mode)
    localStorage.setItem('txn_viewMode', mode)
  }
  const { data: categories = [] } = useQuery(() => getCategories())
  const { data: accounts = [] }   = useQuery(() => getAccounts())
  const { data: tags = [] }       = useQuery(() => getTags(), [refresh])

  const filtered = transactions.filter(t => {
    if (filterAccount  && t.account_id  !== Number(filterAccount))  return false
    if (filterCategory && t.category_id !== Number(filterCategory)) return false
    if (filterTag      && !t.tags.some(tag => tag.id === filterTag)) return false
    if (search) {
      const q = search.toLowerCase()
      const match =
        t.description.toLowerCase().includes(q) ||
        (t.payee ?? '').toLowerCase().includes(q) ||
        (t.category_name ?? '').toLowerCase().includes(q) ||
        (t.account_name ?? '').toLowerCase().includes(q) ||
        t.tags.some(tag => tag.name.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })

  const activeFilters = [filterAccount, filterCategory, filterTag].filter(Boolean).length

  function clearFilters() {
    setFilterAccount('')
    setFilterCategory('')
    setFilterTag(null)
    setSearch('')
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    deleteTransaction(id)
    bump()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => switchMode('month')}
            >Month</button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'year' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => switchMode('year')}
            >Year</button>
          </div>

          {viewMode === 'month' ? (
            <div className="flex items-center gap-1">
              <button onClick={() => changeMonth(m => subMonths(m, 1))} className="btn-ghost p-1">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 w-44 text-center">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => changeMonth(m => addMonths(m, 1))}
                className="btn-ghost p-1"
                disabled={isCurrentMonth}
              >
                <ChevronRight size={18} className={isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : ''} />
              </button>
            </div>
          ) : (
            <YearPicker year={selectedYear} onChange={changeYear} />
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setEditing({})}>+ Add</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            className={`input pl-9 w-full ${search ? 'pr-8' : ''}`}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="input w-40"
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
        >
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select
          className="input w-44"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        {(activeFilters > 0 || search) && (
          <button onClick={clearFilters} className="btn-ghost text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 dark:text-slate-500">Tags:</span>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white transition-opacity"
              style={{ background: tag.color, opacity: filterTag && filterTag !== tag.id ? 0.35 : 1 }}
            >
              {tag.name}
              {filterTag === tag.id && <X size={10} />}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Description</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Account</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Category</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 text-right">Amount</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  {transactions.length === 0 ? `No transactions this ${viewMode}` : 'No transactions match your filters'}
                </td>
              </tr>
            )}
            {filtered.map(tx => (
              <tr key={tx.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="text-slate-800 dark:text-slate-200 truncate">{tx.description}</div>
                  {tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tx.tags.map(tag => (
                        <span key={tag.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ background: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: tx.account_color ?? '#64748b' }} />
                    {tx.account_name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge icon={tx.category_icon} name={tx.category_name} color={tx.category_color} />
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${tx.amount >= 0 ? 'text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditing(tx)}      className="btn-ghost p-1"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(tx.id)} className="btn-ghost p-1 text-red-500 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
            <span>
              {filtered.some(t => t.amount < 0) && (
                <span className="mr-3">Out: {fmt(filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))}</span>
              )}
              {filtered.some(t => t.amount > 0) && (
                <span>In: {fmt(filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {editing !== null && (
        <TransactionModal
          transaction={editing}
          categories={categories}
          accounts={accounts}
          tags={tags}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
