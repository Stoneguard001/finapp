import { useState, useCallback } from 'react'
import { Plus, Pencil, Archive } from 'lucide-react'
import { getBudgets, archiveBudget, PERIOD_LABELS, PERIOD_TO_MONTHLY, getBudgetsWithSpending } from '@/db/queries/budgets'
import { getTransactions } from '@/db/queries/transactions'
import { useQuery } from '@/hooks/useQuery'
import { fmt } from '@/lib/fmt'
import BudgetModal from '@/components/budgets/BudgetModal'

const PERIOD_ORDER = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']

export default function Budgets() {
  const [editing, setEditing] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const { data: budgets = [] }      = useQuery(() => getBudgets(), [refresh])
  const { data: transactions = [] } = useQuery(() => getTransactions({ limit: 5000 }), [refresh])

  const withSpend = getBudgetsWithSpending(budgets, transactions)

  const grouped = PERIOD_ORDER.reduce((acc, p) => {
    acc[p] = withSpend.filter(b => b.period === p)
    return acc
  }, {})

  const monthlyEquivalent = budgets.reduce((s, b) => s + b.amount * PERIOD_TO_MONTHLY[b.period], 0)
  const annualEquivalent  = budgets.reduce((s, b) => s + b.amount * PERIOD_TO_MONTHLY[b.period] * 12, 0)

  function handleArchive(id) {
    if (!confirm('Archive this budget?')) return
    archiveBudget(id)
    bump()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Budgets</h1>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Budget</button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs text-slate-500">Monthly Equivalent</div>
          <div className="text-2xl font-bold text-slate-100">{fmt(monthlyEquivalent)}</div>
          <div className="text-xs text-slate-600 mt-0.5">all budgets normalized</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Annual Equivalent</div>
          <div className="text-2xl font-bold text-slate-100">{fmt(annualEquivalent)}</div>
          <div className="text-xs text-slate-600 mt-0.5">all budgets normalized</div>
        </div>
      </div>

      {/* Budget groups by period */}
      {PERIOD_ORDER.map(period => {
        const items = grouped[period]
        if (items.length === 0) return null
        return (
          <div key={period} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {PERIOD_LABELS[period]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(b => (
                <BudgetCard
                  key={b.id}
                  budget={b}
                  onEdit={() => setEditing(b)}
                  onArchive={() => handleArchive(b.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {budgets.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-500">No budgets yet.</p>
          <button className="btn-primary mt-3" onClick={() => setEditing({})}><Plus size={14} /> Add your first budget</button>
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

function BudgetCard({ budget: b, onEdit, onArchive }) {
  const over = b.pct >= 100
  const warn = b.pct >= 80

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {b.category_icon && <span>{b.category_icon}</span>}
            <span className="font-medium text-slate-100 truncate">{b.name}</span>
          </div>
          {b.category_name && (
            <div className="text-xs text-slate-500 mt-0.5">{b.category_name}</div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <button onClick={onEdit}    className="btn-ghost p-1"><Pencil  size={13} /></button>
          <button onClick={onArchive} className="btn-ghost p-1 text-slate-500"><Archive size={13} /></button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className={over ? 'text-red-400 font-medium' : warn ? 'text-yellow-400' : 'text-slate-400'}>
            {fmt(b.spent)} spent
          </span>
          <span className="text-slate-500">{fmt(b.amount)} budget</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, b.pct)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={over ? 'text-red-400' : 'text-slate-500'}>
            {over ? `${fmt(Math.abs(b.remaining))} over` : `${fmt(b.remaining)} left`}
          </span>
          <span className="text-slate-600">{b.period_start} → {b.period_end}</span>
        </div>
      </div>

      {b.notes && <p className="text-xs text-slate-600 italic">{b.notes}</p>}
    </div>
  )
}
