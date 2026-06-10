import { useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FolderOpen, FilePlus, HelpCircle, Sparkles, Sun, Moon, ChevronDown, LayoutDashboard, ArrowLeftRight, PiggyBank, Wallet, Upload, Tag, ListFilter, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDbStore } from '@/store/dbStore'
import { useTheme } from '@/context/ThemeContext'
import appIcon from '@/assets/app-icon.svg'
import appIconLight from '@/assets/app-icon-light.svg'

export default function Welcome() {
  const { openNew, openFile, openFileHandle } = useDbStore()
  const { dark, toggle } = useTheme()
  const inputRef = useRef()
  const [newDbOpen, setNewDbOpen] = useState(false)

  async function handleOpen() {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }]
        })
        await openFileHandle(handle)
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    inputRef.current.click()
  }

  async function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (file) await openFile(file)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <Helmet>
        <title>EvenKeel — Personal Budget Tracker</title>
        <meta name="description" content="Simple, private budgeting that keeps your data on your device. No accounts, no sync, no cloud." />
      </Helmet>
      <div className="fixed top-3 right-3 flex items-center gap-1">
        <button onClick={handleOpen} title="Load an existing sqlite file" className="btn-ghost text-xs hidden sm:flex"><FolderOpen size={14} /> Open</button>
        <button onClick={() => openNew(false)} title="Create a new sqlite file" className="btn-ghost text-xs hidden sm:flex"><FilePlus size={14} /> New</button>
        <button onClick={handleOpen} title="Load an existing sqlite file" className="btn-ghost text-xs sm:hidden"><FolderOpen size={14} /></button>
        <button onClick={() => openNew(false)} title="Create a new sqlite file" className="btn-ghost text-xs sm:hidden"><FilePlus size={14} /></button>
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <div className="w-full max-w-md sm:max-w-2xl space-y-6">
        <div className="text-center">
          <img src={dark ? appIcon : appIconLight} alt="EvenKeel" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-slate-100">Even</span><span className="text-brand-500">Keel</span>
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Personal budgeting — your data stays yours.</p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">What is EvenKeel?</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            EvenKeel is personal budgeting software that runs entirely in your browser.
            Track your accounts, set monthly spending targets, import bank transactions,
            and analyse your habits — all without creating an account or sending your data anywhere.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: LayoutDashboard, label: 'Dashboard',    desc: 'Balances, recent spending, and budget progress at a glance.' },
              { icon: ArrowLeftRight,  label: 'Transactions', desc: 'Browse, search, and categorise every transaction.' },
              { icon: PiggyBank,       label: 'Budgets',      desc: 'Set monthly spending targets per category.' },
              { icon: Wallet,          label: 'Accounts',     desc: 'Manage checking, savings, and credit cards in one place.' },
              { icon: Upload,          label: 'Import',       desc: 'Drag-in CSV or Excel exports from your bank.' },
              { icon: Tag,             label: 'Categories',   desc: 'Colour-coded categories and sub-categories.' },
              { icon: ListFilter,      label: 'Rules',        desc: 'Auto-tag and categorise incoming transactions.' },
              { icon: BarChart2,       label: 'Stats',        desc: 'Monthly and trend charts for your spending.' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center pt-1">
            <Link to="/about" className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors">Find out more...</Link>
          </p>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Open Database</p>
          <button
            onClick={handleOpen}
            className="w-full flex items-center gap-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50
                       hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <FolderOpen size={20} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">Open Database</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Load an existing .sqlite file from anywhere</div>
            </div>
          </button>
        </div>

        <div className="card space-y-3">
          <button
            onClick={() => setNewDbOpen(o => !o)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">New Database</p>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${newDbOpen ? 'rotate-180' : ''}`} />
          </button>
          {newDbOpen && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openNew(true)}
                className="flex flex-col items-start gap-2 p-4 rounded-lg bg-brand-900/30 border border-brand-800/50
                           hover:bg-brand-900/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center">
                  <Sparkles size={18} className="text-brand-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">With Starter Data</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Categories, budgets, tags &amp; rules pre-filled</div>
                </div>
              </button>

              <button
                onClick={() => openNew(false)}
                className="flex flex-col items-start gap-2 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50
                           hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  <FilePlus size={18} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">Blank</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Empty database, nothing pre-filled</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          For help getting started,{' '}
          <Link to="/help" className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors">see the help page</Link>.
        </p>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Your data is 100% local — no account, no server.
          </p>
          <div className="flex flex-col items-end gap-0.5">
            <Link to="/help" className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
              <HelpCircle size={13} />
              Help
            </Link>
            <span className="text-xs text-slate-400 dark:text-slate-600">v{import.meta.env.VITE_APP_VERSION}</span>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".sqlite,.db"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  )
}
