import { useState, useCallback, useMemo } from 'react'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Search, Info, X, Wand2 } from 'lucide-react'
import { getRules, deleteRule, getCategories, applyRuleToExisting } from '@/db/queries/categories'
import { getBudgets } from '@/db/queries/budgets'
import { getTags } from '@/db/queries/tags'
import { useQuery } from '@/hooks/useQuery'
import { useToast } from '@/context/ToastContext'
import RuleModal from '@/components/RuleModal'

const TYPE_LABEL = { contains: 'contains', starts_with: 'starts with', regex: 'regex' }

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <ChevronsUpDown size={12} className="text-slate-400 dark:text-slate-600" />
  return sort.dir === 'asc'
    ? <ChevronUp size={12} className="text-brand-400" />
    : <ChevronDown size={12} className="text-brand-400" />
}

export default function Rules() {
  const [showModal, setShowModal] = useState(false)
  const [refresh, setRefresh]     = useState(0)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState({ col: 'priority', dir: 'desc' })
  const bump = useCallback(() => setRefresh(r => r + 1), [])
  const { addToast } = useToast()

  const { data: rules      = [] } = useQuery(() => getRules(),      [refresh])
  const { data: categories = [] } = useQuery(() => getCategories())
  const { data: tags       = [] } = useQuery(() => getTags(),       [refresh])
  const { data: budgets    = [] } = useQuery(() => getBudgets())

  function handleDelete(id) {
    if (!confirm('Delete this rule?')) return
    deleteRule(id)
    bump()
  }

  function handleApply(rule) {
    if (!confirm(`Apply rule "${rule.pattern}" to all existing matching transactions?`)) return
    const count = applyRuleToExisting(rule)
    addToast(
      count === 0
        ? 'No matching transactions found.'
        : `Rule applied to ${count} transaction${count === 1 ? '' : 's'}.`,
      count === 0 ? 'error' : 'success'
    )
    bump()
  }

  function toggleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
  }

  const processed = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = q
      ? rules.filter(r =>
          r.pattern.toLowerCase().includes(q) ||
          TYPE_LABEL[r.pattern_type].includes(q) ||
          r.category_name.toLowerCase().includes(q) ||
          (r.budget_item_name ?? '').toLowerCase().includes(q) ||
          String(r.priority).includes(q) ||
          r.tags.some(t => t.name.toLowerCase().includes(q))
        )
      : rules

    return [...filtered].sort((a, b) => {
      let av, bv
      if (sort.col === 'priority')    { av = a.priority;            bv = b.priority }
      if (sort.col === 'pattern')     { av = a.pattern;             bv = b.pattern }
      if (sort.col === 'type')        { av = a.pattern_type;        bv = b.pattern_type }
      if (sort.col === 'category')    { av = a.category_name;       bv = b.category_name }
      if (sort.col === 'budget_item') { av = a.budget_item_name ?? ''; bv = b.budget_item_name ?? '' }
      if (sort.col === 'tags')        { av = a.tags[0]?.name ?? ''; bv = b.tags[0]?.name ?? '' }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ?  1 : -1
      return 0
    })
  }, [rules, search, sort])

  function Th({ col, children }) {
    return (
      <th
        className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 text-left cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {children}
          <SortIcon col={col} sort={sort} />
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Category Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">Auto-assign categories and tags when importing transactions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Rule</button>
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        <Info size={13} className="flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
        <span>Rules are tested from highest priority to lowest — the first match wins. Use higher numbers for more specific rules so they aren't overridden by broader ones.</span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          className={`input pl-9 ${search ? 'pr-8' : ''}`}
          placeholder="Search rules…"
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

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <Th col="type">Match</Th>
              <Th col="pattern">Pattern</Th>
              <Th col="category">Category</Th>
              <Th col="budget_item">Budget Item</Th>
              <Th col="tags">Tags</Th>
              <Th col="priority">
                Priority
                <span
                  title="Higher number = higher priority. The first matching rule wins."
                  onClick={e => e.stopPropagation()}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-default"
                >
                  <Info size={11} />
                </span>
              </Th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  {search ? 'No rules match your search' : 'No rules yet — add one, or use "Save as rule" when importing'}
                </td>
              </tr>
            )}
            {processed.map(r => (
              <tr key={r.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">{TYPE_LABEL[r.pattern_type]}</td>
                <td className="px-4 py-3 font-mono text-slate-800 dark:text-slate-200">{r.pattern}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.category_name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {r.budget_item_name ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map(t => (
                      <span key={t.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                        style={{ background: t.color }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.priority}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleApply(r)}
                      title="Apply to existing transactions"
                      className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-brand-500"
                    >
                      <Wand2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      title="Delete rule"
                      className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <RuleModal
          categories={categories}
          tags={tags}
          budgets={budgets}
          onSave={() => { setShowModal(false); bump() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
