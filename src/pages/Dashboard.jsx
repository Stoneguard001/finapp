import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { getTransactions, getMonthlyTotals, getSpendingByCategory } from '@/db/queries/transactions'
import { getBudgets, PERIOD_TO_MONTHLY } from '@/db/queries/budgets'
import { useQuery } from '@/hooks/useQuery'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/fmt'

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const { dark } = useTheme()
  const navigate = useNavigate()
  const today = new Date()
  const isCurrentMonth = isSameMonth(selectedMonth, today)

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(selectedMonth),   'yyyy-MM-dd')

  const { data: transactions = [] } = useQuery(
    () => getTransactions({ startDate: monthStart, endDate: monthEnd, limit: 2000 }),
    [monthStart]
  )
  const { data: monthly = [] }    = useQuery(() => getMonthlyTotals(6))
  const { data: byCategory = [] } = useQuery(
    () => getSpendingByCategory({ startDate: monthStart, endDate: monthEnd }),
    [monthStart]
  )
  const { data: budgets = [] }    = useQuery(() => getBudgets())

  const monthExpenses = useMemo(() =>
    transactions.filter(t => t.amount < 0 && !t.is_transfer).reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions])

  const monthIncome = useMemo(() =>
    transactions.filter(t => t.amount > 0 && !t.is_transfer).reduce((s, t) => s + t.amount, 0),
    [transactions])

  const monthlyBudgetTotal = useMemo(() =>
    budgets.reduce((s, b) => s + b.amount * PERIOD_TO_MONTHLY[b.period], 0), [budgets])

  // Group budget items by category, sum budgeted amounts, attach monthly spending.
  // Sorted by utilisation % so the most critical categories surface first.
  const categoryBudgetGroups = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      const key = b.category_id ?? 0
      if (!map[key]) map[key] = {
        category_id:   b.category_id,
        category_name: b.category_name ?? 'Uncategorized',
        category_icon: b.category_icon ?? '❓',
        budgeted: 0
      }
      map[key].budgeted += b.amount * (PERIOD_TO_MONTHLY[b.period] ?? 1)
    }
    return Object.values(map).map(group => {
      const spent = byCategory.find(c => c.id === group.category_id)?.total ?? 0
      const pct   = group.budgeted > 0 ? Math.min(100, (spent / group.budgeted) * 100) : 0
      return { ...group, spent, pct }
    }).sort((a, b) => b.pct - a.pct)
  }, [budgets, byCategory])

  const overBudget = categoryBudgetGroups.filter(g => g.pct >= 100).length
  const totalSpend  = useMemo(() => byCategory.reduce((s, c) => s + c.total, 0), [byCategory])

  function handleCategoryClick(cat) {
    if (!cat.id) return
    navigate(`/transactions?month=${format(selectedMonth, 'yyyy-MM')}&category=${cat.id}`)
  }

  const tooltipStyle = dark
    ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }
    : { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }
  const tooltipTextStyle = { color: dark ? '#f1f5f9' : '#1e293b' }
  const tickColor = dark ? '#94a3b8' : '#64748b'

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSelectedMonth(m => subMonths(m, 1))} className="btn-ghost p-1" title="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 w-44 text-center">
          {format(selectedMonth, 'MMMM yyyy')}
        </h1>
        <button
          onClick={() => setSelectedMonth(m => addMonths(m, 1))}
          className="btn-ghost p-1"
          disabled={isCurrentMonth}
          title="Next month"
        >
          <ChevronRight size={18} className={isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : ''} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Spent"         value={fmt(monthExpenses)}      icon={TrendingDown} color="text-red-400"   />
        <KpiCard label="Income"        value={fmt(monthIncome)}         icon={TrendingUp}   color="text-brand-400" />
        <KpiCard label="Monthly Budget" value={fmt(monthlyBudgetTotal)} icon={PiggyBank}    color="text-blue-400"  />
        <KpiCard label="Over Budget"   value={`${overBudget} ${overBudget === 1 ? 'category' : 'categories'}`} icon={Wallet}
          color={overBudget > 0 ? 'text-red-400' : 'text-brand-400'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Income vs Expenses (6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipTextStyle} labelStyle={tooltipTextStyle} formatter={v => [`$${v.toFixed(2)}`, undefined]} />
              <Bar dataKey="income"   fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending pie chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Spending by Category</h2>
          {byCategory.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-600 text-sm text-center py-12">No spending data for this month</p>
          ) : (
            <div className="flex gap-4">
              <ResponsiveContainer width={180} height={180} className="flex-shrink-0">
                <PieChart>
                  <Pie data={byCategory} dataKey="total" cx="50%" cy="50%"
                    innerRadius={48} outerRadius={82} paddingAngle={2}>
                    {byCategory.map((cat, i) => (
                      <Cell key={cat.id ?? i} fill={cat.color ?? '#475569'}
                        onClick={() => handleCategoryClick(cat)}
                        style={{ cursor: cat.id ? 'pointer' : 'default' }} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipTextStyle} labelStyle={tooltipTextStyle}
                    formatter={(v, name) => {
                      const pct = totalSpend > 0 ? Math.round(v / totalSpend * 100) : 0
                      return [`${fmt(v)} (${pct}%)`, name ?? 'Uncategorized']
                    }} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 min-w-0 space-y-1.5">
                {byCategory.map(cat => {
                  const pct = totalSpend > 0 ? Math.round(cat.total / totalSpend * 100) : 0
                  return (
                    <div
                      key={cat.id ?? 'uncategorized'}
                      onClick={() => handleCategoryClick(cat)}
                      className={`flex items-center gap-1.5 text-xs rounded px-1 -mx-1 py-0.5 transition-colors
                        ${cat.id ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color ?? '#475569' }} />
                      <span>{cat.icon ?? '❓'}</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate flex-1">{cat.name ?? 'Uncategorized'}</span>
                      <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">{pct}%</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono flex-shrink-0">{fmt(cat.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget progress */}
      {categoryBudgetGroups.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Budget Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryBudgetGroups.map(g => <CategoryBudgetBar key={g.category_id ?? 'none'} group={g} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{value}</div>
      </div>
    </div>
  )
}

function CategoryBudgetBar({ group }) {
  const over = group.pct >= 100
  const warn = group.pct >= 80 && !over
  return (
    <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 min-w-0">
          <span className="shrink-0">{group.category_icon}</span>
          <span className="truncate">{group.category_name}</span>
        </span>
        <span className={`text-xs shrink-0 ${over ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {fmt(group.spent)} / {fmt(group.budgeted)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-brand-500'}`}
          style={{ width: `${Math.min(100, group.pct)}%` }}
        />
      </div>
      <div className={`text-xs mt-1 ${over ? 'text-red-400' : 'text-slate-400 dark:text-slate-600'}`}>
        {over
          ? `${fmt(group.spent - group.budgeted)} over`
          : `${fmt(group.budgeted - group.spent)} left`}
      </div>
    </div>
  )
}
