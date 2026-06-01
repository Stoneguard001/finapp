import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Pencil, Trash2, X, ChevronLeft, ChevronRight, FolderX, PiggyBank } from 'lucide-react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { getTransactions, deleteTransaction, updateTransaction, getSplitsForDateRange } from '@/db/queries/transactions'
import { getCategories } from '@/db/queries/categories'
import { getAccounts } from '@/db/queries/accounts'
import { getTags } from '@/db/queries/tags'
import { getBudgets } from '@/db/queries/budgets'
import { useQuery } from '@/hooks/useQuery'
import { fmt, fmtDate } from '@/lib/fmt'
import CategoryBadge from '@/components/CategoryBadge'
import YearPicker from '@/components/YearPicker'
import TransactionModal from '@/components/transactions/TransactionModal'
import TransactionDetailSheet from '@/components/transactions/TransactionDetailSheet'
import { useToast } from '@/context/ToastContext'

const NC = '__nc__'

export default function Transactions() {
  const [searchParams] = useSearchParams()
  const [selectedMonth, setSelectedMonth] = useState(() => {
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
  const [filterGroup, setFilterGroup]     = useState('')
  const [filterTag, setFilterTag]               = useState(null)
  const [filterUncategorized, setFilterUncategorized] = useState(false)
  const [filterUnbudgeted, setFilterUnbudgeted]       = useState(false)
  const [editing, setEditing]             = useState(null)
  const [detailTx, setDetailTx]           = useState(null)
  const [refresh, setRefresh]             = useState(0)
  const bump = useCallback(() => setRefresh(r => r + 1), [])
  const { addToast } = useToast()

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkCategory, setBulkCategory] = useState(NC)
  const [bulkBudget, setBulkBudget]     = useState(NC)
  const selectAllRef = useRef(null)

  const isCurrentMonth = isSameMonth(selectedMonth, new Date())
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(selectedMonth),   'yyyy-MM-dd')

  const startDate  = viewMode === 'year' ? `${selectedYear}-01-01` : monthStart
  const endDate    = viewMode === 'year' ? `${selectedYear}-12-31` : monthEnd
  const fetchLimit = viewMode === 'year' ? 5000 : 2000

  const { data: transactions = [] } = useQuery(
    () => getTransactions({ startDate, endDate, limit: fetchLimit }),
    [startDate, endDate, refresh]
  )
  const { data: rawSplits = [] } = useQuery(
    () => getSplitsForDateRange({ startDate, endDate }),
    [startDate, endDate, refresh]
  )
  const splitsByTxId = useMemo(() => {
    const map = new Map()
    for (const s of rawSplits) {
      if (!map.has(s.transaction_id)) map.set(s.transaction_id, [])
      map.get(s.transaction_id).push(s)
    }
    return map
  }, [rawSplits])

  function changeMonth(updater) {
    setSelectedMonth(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('txn_selectedMonth', next.toISOString())
      return next
    })
    setSelectedIds(new Set())
  }

  function changeYear(year) {
    setSelectedYear(year)
    localStorage.setItem('txn_selectedYear', String(year))
    setSelectedIds(new Set())
  }

  function switchMode(mode) {
    if (mode === 'year') changeYear(selectedMonth.getFullYear())
    setViewMode(mode)
    localStorage.setItem('txn_viewMode', mode)
  }

  const { data: categories = [] } = useQuery(() => getCategories())
  const { data: accounts = [] }   = useQuery(() => getAccounts())
  const { data: tags = [] }       = useQuery(() => getTags(), [refresh])
  const { data: allBudgets = [] } = useQuery(() => getBudgets())

  const availableGroups = useMemo(() => {
    const seen = new Set()
    return categories
      .filter(c => c.group_id && !seen.has(c.group_id) && seen.add(c.group_id))
      .map(c => ({ id: c.group_id, name: c.group_name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const groupCatIds = useMemo(() => {
    if (!filterGroup) return null
    return new Set(categories.filter(c => c.group_id === Number(filterGroup)).map(c => c.id))
  }, [filterGroup, categories])

  const filtered = transactions.filter(t => {
    if (filterAccount  && t.account_id !== Number(filterAccount)) return false
    if (filterGroup    && (!t.category_id || !groupCatIds.has(t.category_id))) return false
    if (filterCategory) {
      const catId = Number(filterCategory)
      if (t.category_id !== catId && !t.split_category_ids.includes(catId)) return false
    }
    if (filterTag           && !t.tags.some(tag => tag.id === filterTag)) return false
    if (filterUncategorized && (t.category_id || t.split_count > 0)) return false
    if (filterUnbudgeted    && !(t.category_id && !t.is_transfer && !t.budget_item_name && !t.implied_budget_name)) return false
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

  const allFilteredSelected  = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))
  const someFilteredSelected = filtered.some(t => selectedIds.has(t.id))

  const bulkCategoryBudgets = useMemo(() =>
    bulkCategory !== NC && bulkCategory !== ''
      ? allBudgets.filter(b => b.category_id === Number(bulkCategory))
      : [],
    [bulkCategory, allBudgets]
  )

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected
    }
  }, [someFilteredSelected, allFilteredSelected])

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyBulk() {
    const fields = {}
    if (bulkCategory !== NC) fields.category_id    = bulkCategory ? Number(bulkCategory) : null
    if (bulkBudget   !== NC) fields.budget_item_id = bulkBudget   ? Number(bulkBudget)   : null
    if (!Object.keys(fields).length) return
    const splitIds = []
    selectedIds.forEach(id => {
      const tx = transactions.find(t => t.id === id)
      if (tx?.split_count > 0) { splitIds.push(id); return }
      updateTransaction(id, fields)
    })
    if (splitIds.length > 0) {
      addToast(`${splitIds.length} split transaction${splitIds.length > 1 ? 's' : ''} skipped — edit individually to change category`, 'info')
    }
    setSelectedIds(new Set())
    setBulkCategory(NC)
    setBulkBudget(NC)
    bump()
  }

  const activeFilters = [filterAccount, filterGroup, filterCategory, filterTag, filterUncategorized, filterUnbudgeted].filter(Boolean).length

  function clearFilters() {
    setFilterAccount('')
    setFilterGroup('')
    setFilterCategory('')
    setFilterTag(null)
    setFilterUncategorized(false)
    setFilterUnbudgeted(false)
    setSearch('')
  }

  function handleGroupChange(gid) {
    setFilterGroup(gid)
    if (gid && filterCategory) {
      const cat = categories.find(c => c.id === Number(filterCategory))
      if (cat && cat.group_id !== Number(gid)) setFilterCategory('')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    deleteTransaction(id)
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    bump()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
              <button onClick={() => changeMonth(m => subMonths(m, 1))} className="btn-ghost p-1.5 sm:p-2.5" title="Previous month">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center sm:w-44">
                <span className="sm:hidden">{format(selectedMonth, 'MMM yyyy')}</span>
                <span className="hidden sm:inline">{format(selectedMonth, 'MMMM yyyy')}</span>
              </span>
              <button
                onClick={() => changeMonth(m => addMonths(m, 1))}
                className="btn-ghost p-1.5 sm:p-2.5"
                disabled={isCurrentMonth}
                title="Next month"
              >
                <ChevronRight size={18} className={isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : ''} />
              </button>
            </div>
          ) : (
            <YearPicker year={selectedYear} onChange={changeYear} />
          )}
        </div>
        <button className="btn-primary shrink-0 ml-auto" onClick={() => setEditing({})}>+ Add</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            className={`input pl-9 w-full ${search ? 'pr-8 !border-brand-500' : ''}`}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className={`input w-40 ${filterAccount ? '!border-brand-500' : ''}`}
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
        >
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {availableGroups.length > 0 && (
          <select
            className={`input w-40 ${filterGroup ? '!border-brand-500' : ''}`}
            value={filterGroup}
            onChange={e => handleGroupChange(e.target.value)}
          >
            <option value="">All groups</option>
            {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        <select
          className={`input w-44 ${filterCategory ? '!border-brand-500' : ''}`}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories
            .filter(c => !filterGroup || c.group_id === Number(filterGroup))
            .map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        {(activeFilters > 0 || search) && (
          <button onClick={clearFilters} className="btn-ghost text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Quick filters + tag filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { key: 'uncategorized', icon: FolderX,   label: 'Uncategorized', active: filterUncategorized, set: setFilterUncategorized },
          { key: 'unbudgeted',    icon: PiggyBank,  label: 'Unbudgeted',    active: filterUnbudgeted,    set: setFilterUnbudgeted    },
        ].map(({ key, icon: Icon, label, active, set }) => (
          <button
            key={key}
            onClick={() => { set(v => !v); addToast(active ? `${label} filter removed` : `Showing ${label.toLowerCase()} transactions`, 'info') }}
            title={`Show ${label.toLowerCase()}`}
            className={`p-1.5 rounded border transition-colors ${
              active
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={13} />
          </button>
        ))}

        {tags.length > 0 && (
          <>
            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <span className="text-xs text-slate-400 dark:text-slate-500">Tags:</span>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => {
                  const removing = filterTag === tag.id
                  setFilterTag(removing ? null : tag.id)
                  addToast(removing ? `Tag filter removed` : `Filtering by tag: ${tag.name}`, 'info')
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white transition-opacity"
                style={{ background: tag.color, opacity: filterTag && filterTag !== tag.id ? 0.35 : 1 }}
              >
                {tag.name}
                {filterTag === tag.id && <X size={10} />}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-900 rounded-lg text-sm">
          <span className="font-medium text-brand-700 dark:text-brand-300 shrink-0">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-brand-200 dark:bg-brand-800 shrink-0" />
          <select
            className="input py-1 text-sm"
            value={bulkCategory}
            onChange={e => { setBulkCategory(e.target.value); setBulkBudget(NC) }}
          >
            <option value={NC}>Category: no change</option>
            <option value="">Uncategorized</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {bulkCategoryBudgets.length > 0 && (
            <select
              className="input py-1 text-sm"
              value={bulkBudget}
              onChange={e => setBulkBudget(e.target.value)}
            >
              <option value={NC}>Budget: no change</option>
              <option value="">— none —</option>
              {bulkCategoryBudgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button
            className="btn-primary py-1 px-3 text-sm shrink-0"
            onClick={applyBulk}
            disabled={bulkCategory === NC && bulkBudget === NC}
          >
            Apply
          </button>
          <button
            className="btn-ghost py-1 px-2 text-sm text-slate-500 shrink-0"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
              <th className="px-2 sm:px-4 py-3 w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 w-24 sm:w-32">Date</th>
              <th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Description</th>
              <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Account</th>
              <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Category</th>
              <th className="hidden sm:table-cell px-4 py-3 w-20"></th>
              <th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  {transactions.length === 0 ? `No transactions this ${viewMode}` : 'No transactions match your filters'}
                </td>
              </tr>
            )}
            {filtered.map(tx => {
              const rowBg = selectedIds.has(tx.id) ? 'bg-slate-200/70 dark:bg-slate-700/40' : ''
              const rowHover = 'hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer'
              return (
                <Fragment key={tx.id}>
                  {/* Main row — no bottom border on mobile (category row carries it) */}
                  <tr
                    className={`group border-b-0 ${tx.split_count > 0 ? '' : 'sm:border-b'} border-slate-200/50 dark:border-slate-800/50 ${rowHover} ${rowBg}`}
                    onClick={() => window.innerWidth < 640 ? setDetailTx(tx) : toggleSelect(tx.id)}
                  >
                    <td className="px-2 sm:px-4 pt-3 pb-1 sm:py-3 align-top" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                      />
                    </td>
                    <td className="px-2 sm:px-4 pt-3 pb-1 sm:py-3 text-slate-500 dark:text-slate-400 align-top">
                      <div className="whitespace-nowrap">{fmtDate(tx.date)}</div>
                    </td>
                    <td className="px-2 sm:px-4 pt-3 pb-1 sm:py-3 max-w-xs min-w-0 align-top">
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
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: tx.account_color ?? '#64748b' }} />
                        {tx.account_name}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {tx.split_count > 0
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            Split ({tx.split_count})
                          </span>
                        : <>
                            <CategoryBadge icon={tx.category_icon} name={tx.category_name} color={tx.category_color} />
                            {tx.budget_item_name
                              ? <div className="mt-1 text-[10px] truncate" style={{ color: tx.budget_item_color ?? '#94a3b8' }}>{tx.budget_item_name}</div>
                              : tx.implied_budget_name
                              ? <div className="mt-1 text-[10px] truncate text-slate-400 dark:text-slate-500">~ {tx.implied_budget_name}</div>
                              : null}
                          </>}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(tx)}      className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" title="Edit transaction"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(tx.id)} className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-red-500" title="Delete transaction"><Trash2 size={13} /></button>
                      </div>
                    </td>
                    <td className={`px-2 sm:px-4 pt-3 pb-1 sm:py-3 text-right font-mono font-medium whitespace-nowrap align-top ${tx.amount >= 0 ? 'text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                    </td>
                  </tr>
                  {/* Desktop split sub-rows */}
                  {tx.split_count > 0 && (splitsByTxId.get(tx.id) ?? []).map((s, si, arr) => (
                    <tr
                      key={`${tx.id}-s${si}`}
                      className={`hidden sm:table-row ${rowBg} ${si === arr.length - 1 ? 'border-b border-slate-200/50 dark:border-slate-800/50' : ''}`}
                    >
                      <td />
                      <td />
                      <td />
                      <td />
                      <td className="px-4 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300 dark:text-slate-600 text-xs select-none">
                            {si === arr.length - 1 ? '└' : '├'}
                          </span>
                          <CategoryBadge icon={s.category_icon} name={s.category_name} color={s.category_color} />
                        </div>
                      </td>
                      <td />
                      <td className={`px-4 py-1 text-right font-mono text-xs whitespace-nowrap ${s.amount >= 0 ? 'text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {s.amount >= 0 ? '+' : ''}{fmt(s.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Mobile category row */}
                  <tr
                    className={`sm:hidden border-b border-slate-200/50 dark:border-slate-800/50 ${rowHover} ${rowBg}`}
                    onClick={() => setDetailTx(tx)}
                  >
                    <td className="px-2 pt-0 pb-2" />
                    <td colSpan={2} className="px-2 pt-0 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tx.account_color ?? '#64748b' }} />
                        {tx.split_count > 0
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                              Split ({tx.split_count})
                            </span>
                          : <>
                              <CategoryBadge icon={tx.category_icon} name={tx.category_name} color={tx.category_color} />
                              {tx.budget_item_name
                                ? <span className="text-[10px]" style={{ color: tx.budget_item_color ?? '#94a3b8' }}>{tx.budget_item_name}</span>
                                : tx.implied_budget_name
                                ? <span className="text-[10px] text-slate-400 dark:text-slate-500">~ {tx.implied_budget_name}</span>
                                : null}
                            </>}
                      </div>
                    </td>
                    <td className="px-2 pt-0 pb-2" />
                  </tr>
                </Fragment>
              )
            })}
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

      <TransactionDetailSheet
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
        onEdit={() => { setEditing(detailTx); setDetailTx(null) }}
        onDelete={() => { setDetailTx(null); handleDelete(detailTx.id) }}
      />

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
