import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  Upload, Tag, ListFilter, HelpCircle, Info, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import markIron from '@/assets/mark-iron.svg'
import markWhite from '@/assets/mark-white.svg'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/budgets',      icon: PiggyBank,       label: 'Budgets' },
  { to: '/accounts',     icon: Wallet,          label: 'Accounts' },
  { to: '/import',       icon: Upload,          label: 'Import' },
  { to: '/categories',   icon: Tag,             label: 'Categories' },
  { to: '/rules',        icon: ListFilter,      label: 'Rules' },
  { to: '/help',         icon: HelpCircle,      label: 'Help' },
  { to: '/about',        icon: Info,            label: 'About' },
]

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const { dark } = useTheme()

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex-shrink-0 flex flex-col
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transition-transform duration-200 md:transition-[width] md:duration-200
          w-64 md:relative md:inset-auto md:z-auto md:translate-x-0
          ${collapsed ? 'md:w-14' : 'md:w-56'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div
          className={`flex items-center py-5 border-b border-slate-200 dark:border-slate-800 px-4 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          {collapsed
            ? <img src={dark ? markWhite : markIron} alt="EvenKeel" className="hidden md:block w-7 h-7" />
            : <span className="flex-1 flex items-center gap-2">
                <img src={dark ? markWhite : markIron} alt="" className="w-6 h-6 flex-shrink-0" />
                <span className="text-lg font-bold tracking-tight leading-none">
                  <span className="text-slate-900 dark:text-slate-100">Even</span><span className="text-brand-500">Keel</span>
                </span>
              </span>
          }
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            title="Close menu"
            className="md:hidden p-2 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:block p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                 ${collapsed ? 'md:justify-center md:px-0' : ''}
                 ${isActive
                   ? (dark ? 'bg-brand-900/50 text-brand-400' : 'bg-brand-100 text-brand-700')
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`
              }
            >
              <Icon size={16} />
              <span className={collapsed ? 'md:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
