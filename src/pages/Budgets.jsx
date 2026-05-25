import { useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Link2 } from 'lucide-react'
import { getBudgets, deleteBudget, PERIOD_TO_MONTHLY } from '@/db/queries/budgets'
import { getTransactions, updateTransaction } from '@/db/queries/transactions'
import { useQuery } from '@/hooks/useQuery'
import { fmt, fmtDate } from '@/lib/fmt'
import BudgetModal from '@/components/budgets/BudgetModal'
import YearPicker from '@/components/YearPicker'

const toMonthly = (b) => b.amount * (PERIOD_TO_MONTHLY[b.period] ?? 1)
const toAnnual  = (b) => toMonthly(b) * 12

function buildSections(groupList) {
  const map = {}
  for (const g of groupList) {
    const key = g.group_id ?? '__ungrouped__'
    if (!map[key]) map[key] = { group_id: g.group_id, group_name: g.group_name, categoryGroups: [] }
    map[key].categoryGroups.push(g)
  }
  const hasNamed = Object.keys(map).some(k => k !== '__ungrouped__')
  return Object.values(map)
    .sort((a, b) => {
      if (!a.group_name && b.group_name) return 1
      if (a.group_name && !b.group_name) return -1
      return (a.group_name ?? '').localeCompare(b.group_name ?? '')
    })
    .map(s => ({ ...s, showHeader: hasNamed }))
}

export default function Budgets() {
  const [editing, setEditing]                     = useState(null)
  const [refresh, setRefresh]                     = useState(0)
  const [view, setView]                           = useState('monthly')
  const [expandedItemId, setExpanded]             = useState(null)
  const [selectedYear, setSelectedYear]           = useState(new Date().getFullYear())
  const [collapsedGroups, setCollapsedGroups]     = useState(new Set())
  const [collapsedCategories, setCollapsedCats]   = useState(new Set())
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  function toggleGroup(key) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleCategory(id) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const now         = new Date()
  const currentYear = now.getFullYear()
  const month       = String(now.getMonth() + 1).padStart(2, '0')

  const yearStart  = `${selectedYear}-01-01`
  const yearEnd    = `${selectedYear}-12-31`
  const monthStart = `${currentYear}-${month}-01`
  const monthEnd   = new Date(currentYear, now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: budgets = [] }      = useQuery(() => getBudgets(), [refresh])
  const { data: transactions = [] } = useQuery(
    () => getTransactions({ startDate: yearStart, endDate: yearEnd, limit: 10000 }),
    [yearStart, refresh]
  )

  const spending = useMemo(() => {
    const expMonthly = {}
    const expAnnual  = {}
    const incMonthly = {}
    const incAnnual  = {}

    for (const t of transactions) {
      if (!t.category_id) continue
      if (t.amount < 0) {
        const amt = Math.abs(t.amount)
        expAnnual[t.category_id] = (expAnnual[t.category_id] ?? 0) + amt
        if (t.date >= monthStart && t.date <= monthEnd) {
          expMonthly[t.category_id] = (expMonthly[t.category_id] ?? 0) + amt
        }
      } else if (t.amount > 0) {
        incAnnual[t.category_id] = (incAnnual[t.category_id] ?? 0) + t.amount
        if (t.date >= monthStart && t.date <= monthEnd) {
          incMonthly[t.category_id] = (incMonthly[t.category_id] ?? 0) + t.amount
        }
      }
    }
    return { expMonthly, expAnnual, incMonthly, incAnnual }
  }, [transactions, monthStart, monthEnd])

  const groups = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      const key = b.category_id ?? 0
      if (!map[key]) map[key] = {
        category_id:    b.category_id,
        category_name:  b.category_name  ?? 'Uncategorized',
        category_icon:  b.category_icon  ?? '❓',
        category_color: b.category_color ?? '#475569',
        is_income:      b.is_income      ?? 0,
        group_id:       b.group_id       ?? null,
        group_name:     b.group_name     ?? null,
        items:          []
      }
      map[key].items.push(b)
    }
    return Object.values(map)
  }, [budgets])

  const incomeGroups  = useMemo(() => groups.filter(g => g.is_income),  [groups])
  const expenseGroups = useMemo(() => groups.filter(g => !g.is_income), [groups])
  const incomeSections  = useMemo(() => buildSections(incomeGroups),  [incomeGroups])
  const expenseSections = useMemo(() => buildSections(expenseGroups), [expenseGroups])

  const incomeBudgets  = budgets.filter(b => b.is_income)
  const expenseBudgets = budgets.filter(b => !b.is_income)

  const totalIncMonthly = incomeBudgets.reduce((s, b)  => s + toMonthly(b), 0)
  const totalExpMonthly = expenseBudgets.reduce((s, b) => s + toMonthly(b), 0)
  const totalIncAnnual  = incomeBudgets.reduce((s, b)  => s + toAnnual(b),  0)
  const totalExpAnnual  = expenseBudgets.reduce((s, b) => s + toAnnual(b),  0)
  const netMonthly = totalIncMonthly - totalExpMonthly
  const netAnnual  = totalIncAnnual  - totalExpAnnual

  const hasIncome  = incomeGroups.length > 0
  const hasExpense = expenseGroups.length > 0
  const showBothLabels = hasIncome && hasExpense

  function handleDelete(id) {
    if (!confirm('Remove this budget item?')) return
    deleteBudget(id)
    bump()
  }

  function renderCategoryCard(group) {
    const isIncome = Boolean(group.is_income)

    const actual = view === 'monthly'
      ? isIncome
        ? (spending.incMonthly[group.category_id] ?? 0)
        : (spending.expMonthly[group.category_id] ?? 0)
      : isIncome
        ? (spending.incAnnual[group.category_id] ?? 0)
        : (spending.expAnnual[group.category_id] ?? 0)

    const budgeted  = group.items.reduce((s, b) => s + (view === 'monthly' ? toMonthly(b) : toAnnual(b)), 0)
    const remaining = budgeted - actual
    const pct       = budgeted > 0 ? Math.min(100, (actual / budgeted) * 100) : 0
    const over      = remaining < 0

    const periodLabel = view === 'annual' ? ' YTD' : ' this month'
    const actLabel    = isIncome ? 'received' : 'spent'
    const remLabel    = isIncome
      ? over  ? `${fmt(Math.abs(remaining))} over target` : `${fmt(remaining)} remaining`
      : over  ? `${fmt(Math.abs(remaining))} over`        : `${fmt(remaining)} left`

    // For income, receiving more than expected is fine — no warning/red states
    const barColor = isIncome || !over
      ? pct >= 80 && !isIncome ? 'bg-yellow-500' : 'bg-brand-500'
      : 'bg-red-500'
    const actColor = isIncome ? 'text-slate-500'
      : over ? 'text-red-400 font-medium' : pct >= 80 ? 'text-yellow-500 font-medium' : 'text-slate-500'
    const remColor = over && !isIncome ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'

    const isCatCollapsed = collapsedCategories.has(group.category_id)

    return (
      <div key={group.category_id ?? 'none'} className="card">
        {/* Category header — always visible */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 min-w-0 text-left"
            onClick={() => toggleCategory(group.category_id)}
            title={isCatCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCatCollapsed
              ? <ChevronRight size={14} className="shrink-0 text-slate-400" />
              : <ChevronDown  size={14} className="shrink-0 text-slate-400" />}
            <span className="text-xl leading-none">{group.category_icon}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{group.category_name}</span>
          </button>
          <span className="ml-auto text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
            {fmt(budgeted)}<span className="text-xs text-slate-400 ml-0.5">/{view === 'monthly' ? 'mo' : 'yr'}</span>
          </span>
        </div>

        {!isCatCollapsed && <div className="space-y-3 mt-3">

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className={actColor}>{fmt(actual)} {actLabel}{periodLabel}</span>
            <span className={remColor}>{remLabel}</span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {group.items.map(item => {
            const displayAmt   = view === 'monthly' ? toMonthly(item) : toAnnual(item)
            const nativePeriod = view === 'monthly' ? 'monthly' : 'annual'
            const isConverted  = item.period !== nativePeriod
            const periodAbbr   = { weekly: 'wk', monthly: 'mo', quarterly: 'qtr', semi_annual: '6mo', annual: 'yr' }
            const isExpanded   = expandedItemId === item.id

            const [viewStart, viewEnd] = view === 'monthly'
              ? [monthStart, monthEnd]
              : [yearStart, yearEnd]
            const itemTxns = transactions
              .filter(t =>
                (isIncome ? t.amount > 0 : t.amount < 0) &&
                t.date >= viewStart && t.date <= viewEnd && (
                  t.budget_item_id === item.id ||
                  (t.category_id === item.category_id && !t.budget_item_id)
                )
              )
              .sort((a, b) => b.date.localeCompare(a.date))

            return (
              <div key={item.id}>
                <div className="flex items-center justify-between py-2 first:pt-1">
                  <button
                    className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-left min-w-0"
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                  >
                    {isExpanded
                      ? <ChevronDown size={13} className="shrink-0 text-slate-400" />
                      : <ChevronRight size={13} className="shrink-0 text-slate-400" />}
                    <span className="truncate">{item.name}</span>
                  </button>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {isConverted && (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        {fmt(item.amount)}
                        <span className="text-xs ml-0.5">/{periodAbbr[item.period] ?? item.period}</span>
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {fmt(displayAmt)}
                      <span className="text-xs font-normal text-slate-400 ml-0.5">/{view === 'monthly' ? 'mo' : 'yr'}</span>
                    </span>
                    <button onClick={() => setEditing(item)} className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" title="Edit budget item"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(item.id)} className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-red-500" title="Delete budget item"><Trash2 size={13} /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mb-2 rounded-md bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
                    {itemTxns.length === 0 ? (
                      <p className="text-xs text-slate-400 px-3 py-2">No transactions found for this period.</p>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {itemTxns.map(t => (
                            <div key={t.id} className="flex items-center justify-between px-3 py-1.5 group/row">
                              <div className="flex items-center gap-2 min-w-0">
                                {t.budget_item_id === item.id
                                  ? <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500" title="Linked to this budget item" />
                                  : <span className="shrink-0 w-1.5 h-1.5" />
                                }
                                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{fmtDate(t.date)}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{t.description}</span>
                              </div>
                              <div className="flex items-center gap-1 ml-3 shrink-0">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {fmt(isIncome ? t.amount : Math.abs(t.amount))}
                                </span>
                                {!t.budget_item_id && (
                                  <button
                                    className="opacity-0 group-hover/row:opacity-100 transition-opacity btn-ghost p-1 text-slate-400 hover:text-brand-500"
                                    title="Link to this budget item"
                                    onClick={() => { updateTransaction(t.id, { budget_item_id: item.id }); bump() }}
                                  >
                                    <Link2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {itemTxns.length > 1 && (
                          <div className="flex justify-end px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/50">
                            <span className="text-xs text-slate-500">
                              Total: <span className="font-medium">
                                {fmt(itemTxns.reduce((s, t) => s + (isIncome ? t.amount : Math.abs(t.amount)), 0))}
                              </span>
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 pt-1"
          onClick={() => setEditing({ category_id: group.category_id })}
        >
          <Plus size={12} /> Add item to {group.category_name}
        </button>

        </div>}{/* end collapsible body */}
      </div>
    )
  }

  function renderSections(sections, prefix) {
    return sections.map(section => {
      const groupKey        = `${prefix}_${section.group_id ?? 'none'}`
      const isGroupCollapsed = collapsedGroups.has(groupKey)

      return (
        <div key={section.group_id ?? 'ungrouped'}>
          {section.showHeader && (
            <button
              className="flex items-center gap-1.5 w-full text-left px-1 mb-3 group"
              onClick={() => toggleGroup(groupKey)}
            >
              {isGroupCollapsed
                ? <ChevronRight size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
                : <ChevronDown  size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />}
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                {section.group_name ?? 'Ungrouped'}
              </span>
            </button>
          )}
          {!isGroupCollapsed && (
            <div className="space-y-4">
              {section.categoryGroups.map(g => renderCategoryCard(g))}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Budgets</h1>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Budget Item</button>
      </div>

      {/* View toggle + year picker + expense-only total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setView('monthly')}
            >Monthly</button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'annual' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setView('annual')}
            >Annual</button>
          </div>
          {view === 'annual' && <YearPicker year={selectedYear} onChange={setSelectedYear} />}
        </div>
        {/* Only show simple total when there are no income items */}
        {!hasIncome && budgets.length > 0 && (
          <div className="text-sm text-slate-500">
            Total budgeted:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {fmt(view === 'monthly' ? totalExpMonthly : totalExpAnnual)}
            </span>
            <span className="text-slate-400 ml-1">/{view === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        )}
      </div>

      {/* Income vs Expenses summary — shown when income budget items exist */}
      {hasIncome && budgets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 text-center py-4">
          <div className="px-4 py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Expected Income</p>
            <p className="text-xl font-semibold text-brand-400">
              {fmt(view === 'monthly' ? totalIncMonthly : totalIncAnnual)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">/{view === 'monthly' ? 'mo' : 'yr'}</p>
          </div>
          <div className="px-4 py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Budgeted Expenses</p>
            <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">
              {fmt(view === 'monthly' ? totalExpMonthly : totalExpAnnual)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">/{view === 'monthly' ? 'mo' : 'yr'}</p>
          </div>
          <div className="px-4 py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Projected Net</p>
            <p className={`text-xl font-semibold ${(view === 'monthly' ? netMonthly : netAnnual) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(view === 'monthly' ? netMonthly : netAnnual) >= 0 ? '+' : ''}
              {fmt(view === 'monthly' ? netMonthly : netAnnual)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">/{view === 'monthly' ? 'mo' : 'yr'}</p>
          </div>
        </div>
      )}

      {/* Income section */}
      {hasIncome && (
        <div className="space-y-4">
          {showBothLabels && (
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              Income
            </h2>
          )}
          <div className="space-y-6">{renderSections(incomeSections, 'inc')}</div>
        </div>
      )}

      {/* Expenses section */}
      {hasExpense && (
        <div className="space-y-4">
          {showBothLabels && (
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              Expenses
            </h2>
          )}
          <div className="space-y-6">{renderSections(expenseSections, 'exp')}</div>
        </div>
      )}

      {budgets.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-500 mb-3">No budget items yet.</p>
          <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add your first budget item</button>
        </div>
      )}

      {editing !== null && (
        <BudgetModal
          budget={editing}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
