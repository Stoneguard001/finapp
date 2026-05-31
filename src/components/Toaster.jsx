import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

const STYLES = {
  error:   { bg: 'bg-red-100 dark:bg-red-900/80',     border: 'border-red-300 dark:border-red-700',     icon: AlertCircle, iconClass: 'text-red-600 dark:text-red-400' },
  success: { bg: 'bg-green-100 dark:bg-green-900/80', border: 'border-green-300 dark:border-green-700', icon: CheckCircle, iconClass: 'text-green-600 dark:text-green-400' },
  info:    { bg: 'bg-blue-100 dark:bg-blue-900/80',   border: 'border-blue-300 dark:border-blue-700',   icon: Info,        iconClass: 'text-blue-600 dark:text-blue-400' },
}

export default function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none items-center">
      {toasts.map(t => {
        const s = STYLES[t.type] ?? STYLES.error
        const Icon = s.icon
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto
              max-w-sm ${s.bg} ${s.border}`}
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
