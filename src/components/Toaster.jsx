import { AlertCircle, CheckCircle, X } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

const STYLES = {
  error:   { border: 'border-red-200 dark:border-red-800',     icon: AlertCircle,   iconClass: 'text-red-500' },
  success: { border: 'border-green-200 dark:border-green-800', icon: CheckCircle, iconClass: 'text-green-500' },
}

export default function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const s = STYLES[t.type] ?? STYLES.error
        const Icon = s.icon
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto
              bg-white dark:bg-slate-900 max-w-sm ${s.border}`}
          >
            <Icon size={16} className={`${s.iconClass} shrink-0 mt-0.5`} />
            <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
