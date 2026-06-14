import { useState, useEffect } from 'react'
import { Settings2, Eye, EyeOff } from 'lucide-react'
import { CURRENCY_PRESETS, useCurrency } from '@/context/CurrencyContext'
import { useTheme } from '@/context/ThemeContext'
import { useDbStore } from '@/store/dbStore'
import { useToast } from '@/context/ToastContext'
import { getSetting, setSetting } from '@/db/queries/settings'
import { PROVIDERS } from '@/lib/ai/stream'

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

const PROVIDER_KEYS = Object.keys(PROVIDERS)

function AiSettings() {
  const { addToast } = useToast()
  const [provider,   setProvider]   = useState('anthropic')
  const [apiKey,     setApiKey]     = useState('')
  const [model,      setModel]      = useState(PROVIDERS.anthropic.defaultModel)
  const [ollamaUrl,  setOllamaUrl]  = useState('http://localhost:11434')
  const [showKey,    setShowKey]    = useState(false)

  useEffect(() => {
    const p = getSetting('ai_provider', 'anthropic')
    const k = getSetting('ai_api_key', '')
    const m = getSetting('ai_model', PROVIDERS[p]?.defaultModel ?? PROVIDERS.anthropic.defaultModel)
    const u = getSetting('ai_ollama_url', 'http://localhost:11434')
    setProvider(p)
    setApiKey(k)
    setModel(m)
    setOllamaUrl(u)
  }, [])

  function handleProviderChange(p) {
    setProvider(p)
    setModel(PROVIDERS[p].defaultModel)
  }

  function save() {
    setSetting('ai_provider', provider)
    setSetting('ai_api_key', apiKey.trim())
    setSetting('ai_model', model)
    setSetting('ai_ollama_url', ollamaUrl.trim() || 'http://localhost:11434')
    addToast('AI settings saved', 'success')
  }

  const providerCfg = PROVIDERS[provider] ?? PROVIDERS.anthropic
  const needsKey    = providerCfg.requiresKey
  const isCustom    = providerCfg.customModel
  const canSave     = (!needsKey || apiKey.trim()) && model.trim()

  return (
    <div className="card mb-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">AI Assistant</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {needsKey
          ? 'Your API key is stored only in the local database and sent directly to the selected provider.'
          : 'Ollama runs entirely on your machine — no account or API key required.'}
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider</label>
          <select
            className="input w-full max-w-sm"
            value={provider}
            onChange={e => handleProviderChange(e.target.value)}
          >
            {PROVIDER_KEYS.map(k => (
              <option key={k} value={k}>{PROVIDERS[k].label}</option>
            ))}
          </select>
        </div>

        {provider === 'ollama' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ollama URL</label>
            <input
              type="text"
              className="input w-full max-w-sm"
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Server address — use the default for local installs, or set a custom host/port for network or Docker setups. <code className="font-mono">/v1</code> is appended automatically.
            </p>
          </div>
        )}

        {needsKey && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
            <div className="relative max-w-sm">
              <input
                type={showKey ? 'text' : 'password'}
                className="input w-full pr-10"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Paste your API key…"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
          {isCustom ? (
            <input
              type="text"
              className="input w-full max-w-sm"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. llama3.2, mistral, qwen2.5"
            />
          ) : (
            <select
              className="input w-full max-w-sm"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {providerCfg.models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}
          {isCustom && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Enter the name of any model you've pulled with <code className="font-mono">ollama pull</code>.</p>
          )}
        </div>

        <button
          onClick={save}
          disabled={!canSave}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
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

      {/* AI Assistant */}
      <AiSettings />

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
