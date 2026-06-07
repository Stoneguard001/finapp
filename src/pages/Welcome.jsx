import { useRef, useState } from 'react'
import { FolderOpen, FilePlus, HelpCircle, Sparkles, Sun, Moon, ChevronDown } from 'lucide-react'
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
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-3 right-3 btn-ghost"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={dark ? appIcon : appIconLight} alt="EvenKeel" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-slate-100">Even</span><span className="text-brand-500">Keel</span>
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Personal budgeting — your data stays yours.</p>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          New here?{' '}
          <Link to="/about" className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors">Find out more...</Link>
        </p>

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

        <div className="card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Getting started</p>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">1</span>
              <span>Create a new database or open an existing one above.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">2</span>
              <span>Add your accounts (checking, savings, credit cards) under <strong className="text-slate-700 dark:text-slate-300">Accounts</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">3</span>
              <span>Import transactions from your bank's CSV or Excel export via <strong className="text-slate-700 dark:text-slate-300">Import</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">4</span>
              <span>Visit <strong className="text-slate-700 dark:text-slate-300">Budgets</strong> to set monthly spending targets — starter data includes placeholders ready to fill in.</span>
            </li>
          </ol>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            For additional information, see the{' '}
            <Link to="/help" className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors">help page</Link>.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            100% local — no account, no server, no tracking.
          </p>
          <Link to="/help" className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
            <HelpCircle size={13} />
            Help
          </Link>
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
