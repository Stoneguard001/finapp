import { Save, X, Database, Zap, ZapOff, Sun, Moon } from 'lucide-react'
import { useDbStore } from '@/store/dbStore'
import { useTheme } from '@/context/ThemeContext'

export default function Header() {
  const { dbName, fileHandle, autoSave, save, saveAs, toggleAutoSave, close } = useDbStore()
  const { dark, toggle } = useTheme()

  return (
    <header className="h-12 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Database size={14} className="text-brand-500" />
        <span className="truncate max-w-xs">{dbName}</span>
        {autoSave && fileHandle && (
          <span className="flex items-center gap-1 text-[10px] text-brand-400 bg-brand-900/40 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            auto-save
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost text-xs"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={toggleAutoSave}
          title={autoSave ? 'Auto-save on — click to disable' : 'Auto-save off — click to enable'}
          className={`btn-ghost text-xs flex items-center gap-1.5 ${autoSave ? 'text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          {autoSave ? <Zap size={13} /> : <ZapOff size={13} />}
          Auto
        </button>
        <button onClick={save}   className="btn-ghost text-xs"><Save size={14} /> Save</button>
        <button onClick={saveAs} className="btn-ghost text-xs"><Save size={14} /> Save As</button>
        <button onClick={close}  className="btn-ghost text-xs text-red-400 hover:text-red-300">
          <X size={14} /> Close
        </button>
      </div>
    </header>
  )
}
