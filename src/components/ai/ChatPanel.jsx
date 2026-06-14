import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDbStore } from '@/store/dbStore'
import { getSetting } from '@/db/queries/settings'
import { streamChat } from '@/lib/ai/stream'
import { buildFinancialContext } from '@/lib/ai/context'

function friendlyError(e) {
  const msg = e?.message ?? ''
  if (/429|quota|rate.?limit/i.test(msg))
    return 'Rate limit or quota exceeded. Check your billing plan, or wait a moment and try again.'
  if (/401|403|invalid.?api.?key|api_key/i.test(msg))
    return 'Invalid API key. Double-check the key in Settings.'
  if (/404|not.?found|model/i.test(msg))
    return 'Model not found. Try a different model in Settings.'
  if (/network|fetch|failed to fetch/i.test(msg))
    return 'Could not reach the AI provider. If using Ollama, make sure it is running. Otherwise check your connection.'
  return msg || 'Something went wrong.'
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-brand-500 text-white rounded-br-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
          }`}
      >
        {msg.content || <span className="opacity-50 italic">...</span>}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const ready = useDbStore(s => s.ready)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(false)

  const config = ready ? {
    provider:  getSetting('ai_provider'),
    apiKey:    getSetting('ai_api_key'),
    model:     getSetting('ai_model'),
    ollamaUrl: getSetting('ai_ollama_url', 'http://localhost:11434'),
  } : {}
  const isConfigured = !!(config.provider && config.apiKey && config.model)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!ready) return null

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setError(null)
    abortRef.current = false

    const next = [...messages, { role: 'user', content: text }]
    const placeholder = { role: 'assistant', content: '' }
    setMessages([...next, placeholder])
    setStreaming(true)

    try {
      const system = buildFinancialContext()
      const gen = streamChat({ ...config, system, messages: next })
      let accumulated = ''
      for await (const chunk of gen) {
        if (abortRef.current) break
        accumulated += chunk
        setMessages([...next, { role: 'assistant', content: accumulated }])
      }
    } catch (e) {
      setError(friendlyError(e))
      setMessages(next)
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button (hidden when panel open) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="AI Assistant"
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg flex items-center justify-center transition-colors"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-brand-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Assistant</span>
            </div>
            <button
              onClick={() => { setOpen(false); abortRef.current = true }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          {!isConfigured ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <Bot size={36} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add an API key in Settings to start chatting with your finances.
              </p>
              <button
                onClick={() => { setOpen(false); navigate('/settings') }}
                className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium"
              >
                <Settings2 size={14} /> Go to Settings
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                    <Bot size={32} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Ask anything about your finances.
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5 w-full max-w-xs">
                      {[
                        'How did I spend last month?',
                        'Am I on track with my budgets?',
                        'What are my biggest expenses this year?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus() }}
                          className="text-xs text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => <Message key={i} msg={m} />)}
                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400 text-center mt-2">{error}</p>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  placeholder="Ask about your finances…"
                  className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 max-h-32 overflow-y-auto"
                  style={{ minHeight: '38px' }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                >
                  {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
