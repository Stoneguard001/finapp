import { Menu, Save, X, Database, Zap, ZapOff, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDbStore } from '@/store/dbStore'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'

export default function Header({ onMenuClick }) {
  const { dbName, fileHandle, autoSave, ready, save, saveAs, toggleAutoSave, close } = useDbStore()
  const { dark, toggle } = useTheme()
  const { addToast } = useToast()
  const navigate = useNavigate()

  async function handleToggleAutoSave() {
    const wasOn = autoSave
    await toggleAutoSave()
    if (useDbStore.getState().autoSave !== wasOn) {
      addToast(useDbStore.getState().autoSave ? 'Auto-save is now on' : 'Auto-save is now off', 'info')
    }
  }

  async function handleSave() {
    try {
      await save()
      addToast('File saved successfully', 'success')
    } catch (e) {
      addToast('Save failed: ' + e.message, 'error')
    }
  }

  async function handleSaveAs() {
    try {
      const beforeHandle = useDbStore.getState().fileHandle
      await saveAs()
      const afterHandle = useDbStore.getState().fileHandle
      // Show success if a new handle was obtained, or if no file picker API (download always happens)
      if (afterHandle !== beforeHandle || !('showSaveFilePicker' in window)) {
        addToast('File saved successfully', 'success')
      }
    } catch (e) {
      addToast('Save failed: ' + e.message, 'error')
    }
  }

  function handleClose() {
    close()
    navigate('/', { replace: true })
  }

  const disabledCls = 'opacity-30 pointer-events-none'

  return (
    <header className="h-12 flex items-center justify-between px-3 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden btn-ghost p-2 -ml-1 flex-shrink-0"
          title="Open menu"
        >
          <Menu size={18} />
        </button>
        <Database size={14} className="text-brand-500 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-xs">{dbName}</span>
        {autoSave && fileHandle && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-brand-700 bg-brand-100 dark:text-brand-400 dark:bg-brand-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            auto-save
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost text-xs"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={handleToggleAutoSave}
          title={autoSave ? 'Auto-save on — click to disable' : 'Auto-save off — click to enable'}
          className={`btn-ghost text-xs hidden sm:flex items-center gap-1.5 ${!ready ? disabledCls : autoSave ? 'text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          {autoSave ? <Zap size={13} /> : <ZapOff size={13} />}
          Auto
        </button>
        <button onClick={handleSave}   className={`btn-ghost text-xs hidden sm:flex ${!ready ? disabledCls : ''}`}><Save size={14} /> Save</button>
        <button onClick={handleSaveAs} className={`btn-ghost text-xs hidden sm:flex ${!ready ? disabledCls : ''}`}><Save size={14} /> Save As</button>
        <button
          onClick={handleToggleAutoSave}
          title={autoSave ? 'Auto-save on — click to disable' : 'Auto-save off — click to enable'}
          className={`btn-ghost text-xs sm:hidden ${!ready ? disabledCls : autoSave ? 'text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          {autoSave ? <Zap size={14} /> : <ZapOff size={14} />}
        </button>
        <button onClick={handleSave} className={`btn-ghost text-xs sm:hidden ${!ready ? disabledCls : ''}`} title="Save"><Save size={14} /></button>
        <button onClick={handleClose} className={`btn-ghost text-xs ${!ready ? disabledCls : 'text-red-400 hover:text-red-300'}`}>
          <X size={14} /><span className="hidden sm:inline">Close</span>
        </button>
      </div>
    </header>
  )
}
