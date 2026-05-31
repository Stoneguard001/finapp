import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-slate-800 border border-slate-700 text-sm text-slate-100">
      <span>A new version of EvenKeel is available.</span>
      <button
        className="shrink-0 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-white font-medium transition-colors"
        onClick={() => updateServiceWorker(true)}
      >
        Reload
      </button>
    </div>
  )
}
