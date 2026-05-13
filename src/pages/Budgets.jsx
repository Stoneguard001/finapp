import { useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { getBudgets, deleteBudget, PERIOD_TO_MONTHLY, PERIOD_LABELS, currentPeriodRange } from '@/db/queries/budgets'
import { getTransactions } from '@/db/queries/transactions'
import { useQuery } from '@/hooks/useQuery'
import { fmt, fmtDate } from '@/lib/fmt'
import BudgetModal from '@/components/budgets/BudgetModal'

// Convert any budget item's amount to its monthly or annual equivalent
const toMonthly = (b) => b.amount * (PERIOD_TO_MONTHLY[b.period] ?? 1)
const toAnnual  = (b) => toMonthly(b) * 12

export default function Budgets() {
  const [editing, setEditing]         = useState(null)
  const [refresh, setRefresh]         = useState(0)
  const [view, setView]               = useState('monthly')
  const [expandedItemId, setExpanded] = useState(null)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const yearStart  = `${year}-01-01`
  const yearEnd    = `${year}-12-31`
  const monthStart = `${year}-${month}-01`
  const monthEnd   = new Date(year, now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: budgets = [] }      = useQuery(() => getBudgets(), [refresh])
  const { data: transactions = [] } = useQuery(() => getTransactions({ startDate: yearStart, endDate: yearEnd, limit: 10000 }), [refresh])

  // spending per category
  // linkedMonthly: amortized monthly contribution from transactions tied to a non-monthly budget item
  // monthly: raw spend this month from unlinked transactions (or those linked to a monthly item)
  // annual: raw YTD spend for the annual view
  const spending = useMemo(() => {
    const monthly       = {}
    const annual        = {}
    const linkedMonthly = {}
    for (const t of transactions) {
      if (t.amount >= 0 || !t.category_id) continue
      const amt = Math.abs(t.amount)
      annual[t.category_id] = (annual[t.category_id] ?? 0) + amt

      const period = t.budget_item_id ? t.budget_item_period : null
      if (period && period !== 'monthly') {
        // Amortize to a monthly equivalent so a $120 annual charge counts as $10/mo
        const factor = PERIOD_TO_MONTHLY[period] ?? 1
        linkedMonthly[t.category_id] = (linkedMonthly[t.category_id] ?? 0) + amt * factor
      } else if (t.date >= monthStart && t.date <= monthEnd) {
        monthly[t.category_id] = (monthly[t.category_id] ?? 0) + amt
      }
    }
    return { monthly, annual, linkedMonthly }
  }, [transactions, monthStart, monthEnd])

  // group budgets by category
  const groups = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      const key = b.category_id ?? 0
      if (!map[key]) map[key] = {
        category_id:    b.category_id,
        category_name:  b.category_name  ?? 'Uncategorized',
        category_icon:  b.category_icon  ?? '❓',
        category_color: b.category_color ?? '#475569',
        items: []
      }
      map[key].items.push(b)
    }
    return Object.values(map).sort((a, b) => a.category_name.localeCompare(b.category_name))
  }, [budgets])

  const totalMonthly = budgets.reduce((s, b) => s + toMonthly(b), 0)
  const totalAnnual  = budgets.reduce((s, b) => s + toAnnual(b),  0)

  function handleDelete(id) {
    if (!confirm('Remove this budget item?')) return
    deleteBudget(id)
    bump()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Budgets</h1>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Budget Item</button>
      </div>

      {/* View toggle + totals */}
      <div className="flex items-center justify-between">
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
        {budgets.length > 0 && (
          <div className="text-sm text-slate-500">
            Total budgeted:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {fmt(view === 'monthly' ? totalMonthly : totalAnnual)}
            </span>
            <span className="text-slate-400 ml-1">/{view === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        )}
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {groups.map(group => {
          const spent       = view === 'monthly'
            ? (spending.monthly[group.category_id] ?? 0) + (spending.linkedMonthly[group.category_id] ?? 0)
            : (spending.annual[group.category_id]  ?? 0)
          const budgeted    = group.items.reduce((s, b) => s + (view === 'monthly' ? toMonthly(b) : toAnnual(b)), 0)
          const remaining   = budgeted - spent
          const pct         = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0
          const over        = remaining < 0
          const warn        = pct >= 80 && !over

          return (
            <div key={group.category_id ?? 'none'} className="card space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl leading-none">{group.category_icon}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{group.category_name}</span>
                <span className="ml-auto text-sm font-medium text-slate-700 dark:text-slate-300">
                  {fmt(budgeted)}<span className="text-xs text-slate-400 ml-0.5">/{view === 'monthly' ? 'mo' : 'yr'}</span>
                </span>
              </div>

              {/* Spending progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={over ? 'text-red-400 font-medium' : warn ? 'text-yellow-500 font-medium' : 'text-slate-500'}>
                    {fmt(spent)} spent{view === 'annual' ? ' YTD' : ' this month'}
                  </span>
                  <span className={over ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}>
                    {over ? `${fmt(Math.abs(remaining))} over` : `${fmt(remaining)} left`}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-brand-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>

              {/* Budget line items */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.items.map(item => {
                  const displayAmt   = view === 'monthly' ? toMonthly(item) : toAnnual(item)
                  const nativePeriod = view === 'monthly' ? 'monthly' : 'annual'
                  const isConverted  = item.period !== nativePeriod
                  const periodAbbr   = { weekly: 'wk', monthly: 'mo', quarterly: 'qtr', semi_annual: '6mo', annual: 'yr' }
                  const isExpanded   = expandedItemId === item.id

                  const [periodStart, periodEnd] = currentPeriodRange(item)
                  const itemTxns = transactions
                    .filter(t =>
                      t.amount < 0 && (
                        t.budget_item_id === item.id ||
                        (t.category_id === item.category_id && !t.budget_item_id &&
                         t.date >= periodStart && t.date <= periodEnd)
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
                          <button onClick={() => setEditing(item)} className="btn-ghost p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(item.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
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
                                  <div key={t.id} className="flex items-center justify-between px-3 py-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {t.budget_item_id === item.id && (
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500" title="Linked to this budget item" />
                                      )}
                                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{fmtDate(t.date)}</span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{t.description}</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-3 shrink-0">{fmt(Math.abs(t.amount))}</span>
                                  </div>
                                ))}
                              </div>
                              {itemTxns.length > 1 && (
                                <div className="flex justify-end px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/50">
                                  <span className="text-xs text-slate-500">Total: <span className="font-medium">{fmt(itemTxns.reduce((s, t) => s + Math.abs(t.amount), 0))}</span></span>
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
            </div>
          )
        })}
      </div>

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
