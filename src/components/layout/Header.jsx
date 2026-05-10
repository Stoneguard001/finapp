import { Save, FolderOpen, X, Database } from 'lucide-react'
import { useDbStore } from '@/store/dbStore'

export default function Header() {
  const { dbName, save, saveAs, close } = useDbStore()

  return (
    <header className="h-12 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Database size={14} className="text-brand-500" />
        <span className="truncate max-w-xs">{dbName}</span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={save}    className="btn-ghost text-xs"><Save size={14} /> Save</button>
        <button onClick={saveAs}  className="btn-ghost text-xs"><Save size={14} /> Save As</button>
        <button onClick={close}   className="btn-ghost text-xs text-red-400 hover:text-red-300">
          <X size={14} /> Close
        </button>
      </div>
    </header>
  )
}
