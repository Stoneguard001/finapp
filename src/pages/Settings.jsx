import { Settings2 } from 'lucide-react'
import { CURRENCY_PRESETS, useCurrency } from '@/context/CurrencyContext'
import { useTheme } from '@/context/ThemeContext'
import { useDbStore } from '@/store/dbStore'
import { useToast } from '@/context/ToastContext'

function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
        ${enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { presetId, setPreset, fmt } = useCurrency()
  const { dark, toggle: toggleDark } = useTheme()
  const { autoSave, toggleAutoSave, fileHandle, ready } = useDbStore()
  const { addToast } = useToast()

  async function handleToggleAutoSave() {
    const wasOn = autoSave
    await toggleAutoSave()
    if (useDbStore.getState().autoSave !== wasOn) {
      addToast(useDbStore.getState().autoSave ? 'Auto-save is now on' : 'Auto-save is now off', 'info')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 size={28} className="text-brand-500 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">App preferences</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="card mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Appearance</h2>
        <SettingRow label="Dark mode" description="Saved across sessions.">
          <Toggle enabled={dark} onToggle={toggleDark} />
        </SettingRow>
      </div>

      {/* File */}
      <div className="card mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">File</h2>
        <SettingRow
          label="Auto-save"
          description={
            autoSave && !fileHandle
              ? 'Requires a saved file — use Save As first.'
              : 'Automatically saves changes to disk.'
          }
        >
          <Toggle enabled={autoSave} onToggle={handleToggleAutoSave} disabled={!ready} />
        </SettingRow>
      </div>

      {/* Currency */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Currency</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Controls how amounts are displayed. Saved to the open database.
        </p>
        <select
          className="input w-full max-w-sm"
          value={presetId}
          onChange={e => setPreset(e.target.value)}
        >
          {CURRENCY_PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Preview: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(1234567.89)}</span>
        </p>
      </div>
    </div>
  )
}
