import { useMemo } from 'react'
import { TrendingDown, TrendingUp, Wallet, PiggyBank } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { getTransactions, getMonthlyTotals, getSpendingByCategory } from '@/db/queries/transactions'
import { getBudgets } from '@/db/queries/budgets'
import { getBudgetsWithSpending, PERIOD_TO_MONTHLY } from '@/db/queries/budgets'
import { useQuery } from '@/hooks/useQuery'
import { fmt } from '@/lib/fmt'

export default function Dashboard() {
  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(today),   'yyyy-MM-dd')

  const { data: transactions = [] } = useQuery(() => getTransactions({ startDate: monthStart, endDate: monthEnd, limit: 2000 }))
  const { data: monthly = [] }      = useQuery(() => getMonthlyTotals(6))
  const { data: byCategory = [] }   = useQuery(() => getSpendingByCategory({ startDate: monthStart, endDate: monthEnd }))
  const { data: budgets = [] }      = useQuery(() => getBudgets())

  const monthExpenses = useMemo(() => transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [transactions])
  const monthIncome   = useMemo(() => transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), [transactions])

  const monthlyBudgetTotal = useMemo(() =>
    budgets.reduce((s, b) => s + b.amount * PERIOD_TO_MONTHLY[b.period], 0), [budgets])

  const budgetsWithSpend = useMemo(() =>
    getBudgetsWithSpending(budgets, transactions), [budgets, transactions])

  const overBudget = budgetsWithSpend.filter(b => b.pct >= 100).length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">
        {format(today, 'MMMM yyyy')}
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Spent This Month"  value={fmt(monthExpenses)} icon={TrendingDown} color="text-red-400"    />
        <KpiCard label="Income This Month" value={fmt(monthIncome)}   icon={TrendingUp}  color="text-brand-400"  />
        <KpiCard label="Monthly Budget"    value={fmt(monthlyBudgetTotal)} icon={PiggyBank} color="text-blue-400" />
        <KpiCard label="Over Budget"       value={`${overBudget} budgets`} icon={Wallet}  color={overBudget > 0 ? 'text-red-400' : 'text-brand-400'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly income vs expenses */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-400 mb-4">Income vs Expenses (6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v) => [`$${v.toFixed(2)}`, undefined]}
              />
              <Bar dataKey="income"   fill="#22c55e" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-400 mb-4">Top Spending Categories</h2>
          <div className="space-y-2">
            {byCategory.slice(0, 7).map(cat => (
              <div key={cat.id ?? 'uncategorized'} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{cat.icon ?? '❓'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-300 truncate">{cat.name ?? 'Uncategorized'}</span>
                    <span className="text-slate-400">{fmt(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${byCategory[0]?.total ? (cat.total / byCategory[0].total) * 100 : 0}%`,
                        background: cat.color ?? '#475569'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {byCategory.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">No transactions this month</p>
            )}
          </div>
        </div>
      </div>

      {/* Budget progress */}
      {budgetsWithSpend.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium text-slate-400 mb-4">Budget Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgetsWithSpend.slice(0, 9).map(b => (
              <BudgetBar key={b.id} budget={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-100 truncate">{value}</div>
      </div>
    </div>
  )
}

function BudgetBar({ budget }) {
  const over = budget.pct >= 100
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 font-medium truncate">{budget.name}</span>
        <span className={over ? 'text-red-400' : 'text-slate-400'}>
          {fmt(budget.spent)} / {fmt(budget.amount)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: `${Math.min(100, budget.pct)}%` }}
        />
      </div>
      <div className="text-xs text-slate-600 mt-1 capitalize">{budget.period.replace('_', '-')}</div>
    </div>
  )
}
