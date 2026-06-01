import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { getTransactions, getMonthlyTotals, getYearMonthlyTotals, getSpendingByCategory, getSplitsForDateRange } from '@/db/queries/transactions'
import { getBudgets, PERIOD_TO_MONTHLY } from '@/db/queries/budgets'
import { useQuery } from '@/hooks/useQuery'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/fmt'

// Returns the pro-rated budgeted amount for a budget item within a date window.
// Returns 0 if the budget is inactive during the window (ended before or starts after).
function budgetedAmount(budget, windowStart, windowEnd) {
  if (budget.end_date   && budget.end_date   < windowStart) return 0
  if (budget.start_date && budget.start_date > windowEnd)   return 0
  const effStart = (budget.start_date > windowStart) ? budget.start_date : windowStart
  const effEnd   = (budget.end_date   && budget.end_date < windowEnd) ? budget.end_date : windowEnd
  const monthly  = budget.amount * (PERIOD_TO_MONTHLY[budget.period] ?? 1)
  const s = new Date(effStart)
  const e = new Date(effEnd)
  const months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1
  return monthly * Math.max(0, months)
}

export default function Dashboard() {
  const [view, setView]               = useState('month')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear())
  const { dark } = useTheme()
  const navigate = useNavigate()
  const today = new Date()
  const currentYear = today.getFullYear()

  const isCurrentMonth = isSameMonth(selectedMonth, today)
  const isCurrentYear  = selectedYear === currentYear

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(selectedMonth),   'yyyy-MM-dd')
  const yearStart  = `${selectedYear}-01-01`
  const yearEnd    = isCurrentYear ? format(today, 'yyyy-MM-dd') : `${selectedYear}-12-31`

  const ytdStart = `${currentYear}-01-01`
  const ytdEnd   = format(today, 'yyyy-MM-dd')

  const activeStart = view === 'year' ? yearStart : view === 'ytd' ? ytdStart : monthStart
  const activeEnd   = view === 'year' ? yearEnd   : view === 'ytd' ? ytdEnd   : monthEnd

  // Budget window: year view always targets the full year so the budget total
  // reflects what was planned for all 12 months, not just the months elapsed so far.
  const budgetEnd = view === 'year' ? `${selectedYear}-12-31` : activeEnd

  const { data: transactions = [] } = useQuery(
    () => getTransactions({ startDate: activeStart, endDate: activeEnd, limit: 5000 }),
    [activeStart, activeEnd]
  )
  const { data: monthly = [] }       = useQuery(() => getMonthlyTotals(6))
  const yearForChart = view === 'ytd' ? currentYear : selectedYear
  const { data: yearlyMonthly = [] } = useQuery(
    () => getYearMonthlyTotals(yearForChart),
    [yearForChart]
  )
  const { data: byCategory = [] } = useQuery(
    () => getSpendingByCategory({ startDate: activeStart, endDate: activeEnd }),
    [activeStart, activeEnd]
  )
  const { data: splits = [] } = useQuery(
    () => getSplitsForDateRange({ startDate: activeStart, endDate: activeEnd }),
    [activeStart, activeEnd]
  )
  const { data: budgets = [] } = useQuery(() => getBudgets())

  const totalExpenses = useMemo(() =>
    transactions.filter(t => t.amount < 0 && !t.is_transfer).reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions])

  const totalIncome = useMemo(() =>
    transactions.filter(t => t.amount > 0 && !t.is_transfer).reduce((s, t) => s + t.amount, 0),
    [transactions])

  const budgetTotal = useMemo(() =>
    budgets
      .filter(b => !b.is_income)
      .reduce((s, b) => s + budgetedAmount(b, activeStart, budgetEnd), 0),
    [budgets, activeStart, budgetEnd])

  const incomeCategoryIds = useMemo(() =>
    new Set(budgets.filter(b => b.is_income).map(b => b.category_id)),
    [budgets])

  // Month view: normalize non-monthly budget items to monthly equivalent for pace comparison.
  // Year view: raw spending — annual budget amounts are already the right scale.
  // Positive transactions on expense categories (refunds, rebates) net against spending.
  const normalizedSpending = useMemo(() => {
    const map = {}

    function applyAmount(catId, amount, periodKey) {
      if (amount < 0) {
        const amt = Math.abs(amount)
        if (view === 'year' || view === 'ytd') {
          map[catId] = (map[catId] ?? 0) + amt
        } else {
          const factor = PERIOD_TO_MONTHLY[periodKey] ?? 1
          const value  = (periodKey && factor < 1) ? amt * factor : amt
          map[catId] = (map[catId] ?? 0) + value
        }
      } else if (amount > 0) {
        if (incomeCategoryIds.has(catId)) {
          map[catId] = (map[catId] ?? 0) + amount
        } else {
          map[catId] = (map[catId] ?? 0) - amount
        }
      }
    }

    // Non-split transactions
    for (const t of transactions) {
      if (t.is_transfer || !t.category_id || t.split_count > 0) continue
      const period = t.budget_item_id ? t.budget_item_period : null
      applyAmount(t.category_id, t.amount, period)
    }

    // Split portions
    for (const s of splits) {
      if (!s.category_id) continue
      applyAmount(s.category_id, s.amount, s.budget_item_period ?? null)
    }

    return map
  }, [transactions, splits, view, incomeCategoryIds])

  const categoryBudgetGroups = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      const key = b.category_id ?? 0
      if (!map[key]) map[key] = {
        category_id:   b.category_id,
        category_name: b.category_name ?? 'Uncategorized',
        category_icon: b.category_icon ?? '❓',
        is_income:     b.is_income ?? 0,
        budgeted: 0
      }
      map[key].budgeted += budgetedAmount(b, activeStart, budgetEnd)
    }
    return Object.values(map).map(group => {
      const spent = Math.max(0, normalizedSpending[group.category_id] ?? 0)
      const pct   = group.budgeted > 0 ? Math.min(100, (spent / group.budgeted) * 100) : 0
      return { ...group, spent, pct }
    }).sort((a, b) => b.pct - a.pct)
  }, [budgets, normalizedSpending, activeStart, budgetEnd])

  const overBudget = categoryBudgetGroups.filter(g => g.pct >= 100).length
  const totalSpend = useMemo(() => byCategory.reduce((s, c) => s + c.total, 0), [byCategory])

  // Format year chart months as abbreviated names (Jan, Feb, …)
  const yearChartData = useMemo(() =>
    yearlyMonthly.map(row => ({
      ...row,
      month: format(new Date(row.month + '-15'), 'MMM')
    })),
    [yearlyMonthly]
  )

  function handleCategoryClick(cat) {
    if (!cat.id || view === 'year' || view === 'ytd') return
    navigate(`/transactions?month=${format(selectedMonth, 'yyyy-MM')}&category=${cat.id}`)
  }

  const tooltipStyle = dark
    ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }
    : { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }
  const tooltipTextStyle = { color: dark ? '#f1f5f9' : '#1e293b' }
  const tickColor = dark ? '#94a3b8' : '#64748b'

  return (
    <div className="space-y-6">
      {/* View toggle + navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
          {['month', 'ytd', 'year'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === v
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {v === 'month' ? 'Month' : v === 'ytd' ? 'YTD' : 'Year'}
            </button>
          ))}
        </div>

        {view === 'month' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedMonth(m => subMonths(m, 1))} className="btn-ghost p-2.5" title="Previous month">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 w-44 text-center">
              {format(selectedMonth, 'MMMM yyyy')}
            </h1>
            <button
              onClick={() => setSelectedMonth(m => addMonths(m, 1))}
              className="btn-ghost p-2.5"
              disabled={isCurrentMonth}
              title="Next month"
            >
              <ChevronRight size={18} className={isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : ''} />
            </button>
          </div>
        ) : view === 'ytd' ? (
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {currentYear} YTD
          </h1>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear(y => y - 1)} className="btn-ghost p-2.5" title="Previous year">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 w-44 text-center">
              {selectedYear}
            </h1>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="btn-ghost p-2.5"
              disabled={isCurrentYear}
              title="Next year"
            >
              <ChevronRight size={18} className={isCurrentYear ? 'text-slate-300 dark:text-slate-700' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Spent"  value={fmt(totalExpenses)} icon={TrendingDown} color="text-red-400"   />
        <KpiCard label="Income" value={fmt(totalIncome)}   icon={TrendingUp}   color="text-brand-400" />
        <KpiCard
          label={view === 'month' ? 'Monthly Budget' : view === 'ytd' ? 'YTD Budget' : 'Annual Budget'}
          value={fmt(budgetTotal)}
          icon={PiggyBank}
          color="text-blue-400"
        />
        <KpiCard
          label="Over Budget"
          value={`${overBudget} ${overBudget === 1 ? 'category' : 'categories'}`}
          icon={Wallet}
          color={overBudget > 0 ? 'text-red-400' : 'text-brand-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
            {view === 'ytd'
              ? `Income vs Expenses (${currentYear} YTD)`
              : view === 'year'
              ? `Income vs Expenses (${selectedYear})`
              : 'Income vs Expenses (6 months)'}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={view === 'month' ? monthly : yearChartData} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipTextStyle} labelStyle={tooltipTextStyle}
                formatter={(v, name) => [fmt(v), name]} />
              <Bar dataKey="income"   fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending pie chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Spending by Category</h2>
          {byCategory.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-600 text-sm text-center py-12">
              No spending data for this {view === 'month' ? 'month' : 'year'}
            </p>
          ) : (
            <div className="flex flex-col items-center sm:flex-row gap-4">
              <div className="w-[180px] h-[180px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="total" cx="50%" cy="50%"
                      innerRadius={48} outerRadius={82} paddingAngle={2}>
                      {byCategory.map((cat, i) => (
                        <Cell key={cat.id ?? i} fill={cat.color ?? '#475569'}
                          onClick={() => handleCategoryClick(cat)}
                          style={{ cursor: cat.id && view === 'month' ? 'pointer' : 'default' }} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipTextStyle} labelStyle={tooltipTextStyle}
                      formatter={(v, name) => {
                        const pct = totalSpend > 0 ? Math.round(v / totalSpend * 100) : 0
                        return [`${fmt(v)} (${pct}%)`, name ?? 'Uncategorized']
                      }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                {byCategory.map(cat => {
                  const pct = totalSpend > 0 ? Math.round(cat.total / totalSpend * 100) : 0
                  const clickable = cat.id && view === 'month'
                  return (
                    <div
                      key={cat.id ?? 'uncategorized'}
                      onClick={() => handleCategoryClick(cat)}
                      className={`flex items-center gap-1.5 text-xs rounded px-1 -mx-1 py-0.5 transition-colors
                        ${clickable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
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
            {categoryBudgetGroups.map(g => (
              <CategoryBudgetBar
                key={g.category_id ?? 'none'}
                group={g}
                onClick={g.category_id && view === 'month'
                  ? () => navigate(`/transactions?month=${format(selectedMonth, 'yyyy-MM')}&category=${g.category_id}`)
                  : undefined}
              />
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

function CategoryBudgetBar({ group, onClick }) {
  const isIncome = Boolean(group.is_income)
  const over = group.pct >= 100
  const warn = group.pct >= 80 && !over && !isIncome

  const barColor = isIncome
    ? over ? 'bg-brand-500' : 'bg-green-500'
    : over ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-green-500'

  const subline = isIncome
    ? over
      ? `${fmt(group.spent - group.budgeted)} above target`
      : `${fmt(group.budgeted - group.spent)} remaining`
    : over
      ? `${fmt(group.spent - group.budgeted)} over`
      : `${fmt(group.budgeted - group.spent)} left`

  return (
    <div
      className={`bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3 ${onClick ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 min-w-0">
          <span className="shrink-0">{group.category_icon}</span>
          <span className="truncate">{group.category_name}</span>
        </span>
        <span className={`text-xs shrink-0 ${!isIncome && over ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {fmt(group.spent)} / {fmt(group.budgeted)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, group.pct)}%` }}
        />
      </div>
      <div className={`text-xs mt-1 ${isIncome && over ? 'text-blue-500' : !isIncome && over ? 'text-red-400' : 'text-slate-400 dark:text-slate-400'}`}>
        {subline}
      </div>
    </div>
  )
}
