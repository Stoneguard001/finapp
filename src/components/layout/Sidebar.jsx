import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  Upload, Tag, ListFilter, HelpCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/budgets',      icon: PiggyBank,       label: 'Budgets' },
  { to: '/accounts',     icon: Wallet,          label: 'Accounts' },
  { to: '/import',       icon: Upload,          label: 'Import' },
  { to: '/categories',   icon: Tag,             label: 'Categories' },
  { to: '/rules',        icon: ListFilter,      label: 'Rules' },
  { to: '/help',         icon: HelpCircle,      label: 'Help' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)
  const { dark } = useTheme()

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-56'} flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-200`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-5 border-b border-slate-200 dark:border-slate-800`}>
        {!collapsed && (
          <span className="flex-1 text-lg font-bold text-brand-500 tracking-tight">FinApp</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center py-2 rounded-lg text-sm font-medium transition-colors
               ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}
               ${isActive
                 ? (dark ? 'bg-brand-900/50 text-brand-400' : 'bg-brand-100 text-brand-700')
                 : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`
            }
          >
            <Icon size={16} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
