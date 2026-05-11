import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  Upload, Tag, ListFilter
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/budgets',      icon: PiggyBank,       label: 'Budgets' },
  { to: '/accounts',     icon: Wallet,          label: 'Accounts' },
  { to: '/import',       icon: Upload,          label: 'Import' },
  { to: '/categories',   icon: Tag,             label: 'Categories' },
  { to: '/rules',        icon: ListFilter,      label: 'Rules' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        <span className="text-lg font-bold text-brand-500 tracking-tight">FinApp</span>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-brand-900/50 text-brand-500 dark:text-brand-400'
                 : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
