import { useRef } from 'react'
import { FolderOpen, FilePlus, Database } from 'lucide-react'
import { useDbStore } from '@/store/dbStore'

export default function Welcome() {
  const { openNew, openFile, openFileHandle } = useDbStore()
  const inputRef = useRef()

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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-900/50 mb-4">
            <Database size={32} className="text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">FinApp</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Personal budgeting — your data stays yours.</p>
        </div>

        <div className="card space-y-3">
          <button
            onClick={openNew}
            className="w-full flex items-center gap-4 p-4 rounded-lg bg-brand-900/30 border border-brand-800/50
                       hover:bg-brand-900/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-900 flex items-center justify-center flex-shrink-0">
              <FilePlus size={20} className="text-brand-400" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">New Database</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Start fresh — create a new .sqlite file</div>
            </div>
          </button>

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

        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
          100% local — no account, no server, no tracking.
        </p>
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
