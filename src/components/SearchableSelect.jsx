import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// options: [{ value, label }]
// value: current selected value (string or number); '' means nothing selected
export default function SearchableSelect({ value, onChange, options, placeholder = 'Select…', className = '' }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi]       = useState(0)
  const containerRef    = useRef(null)
  const triggerRef      = useRef(null)
  const inputRef        = useRef(null)
  const listRef         = useRef(null)
  const clickingTrigger = useRef(false)

  const selected = options.find(o => String(o.value) === String(value))
  const filtered  = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { setHi(0) }, [query])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (!containerRef.current?.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelectorAll('[data-opt]')[hi]?.scrollIntoView({ block: 'nearest' })
  }, [hi])

  function pick(opt) {
    onChange(opt.value)
    setQuery('')
    setOpen(false)
    // Return focus to trigger synchronously — while the input is still in the DOM,
    // relatedTarget will be the input (inside container), so onFocus won't reopen.
    triggerRef.current?.focus()
  }

  function handleTriggerFocus(e) {
    const wasClick = clickingTrigger.current
    clickingTrigger.current = false
    if (wasClick) return  // onClick will handle the toggle; don't interfere
    if (containerRef.current?.contains(e.relatedTarget)) return  // focus returning after pick()
    setOpen(true)  // genuine Tab/programmatic focus from outside — open immediately
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)); break
      case 'ArrowUp':   e.preventDefault(); setHi(h => Math.max(h - 1, 0)); break
      case 'Enter':     e.preventDefault(); if (filtered[hi]) pick(filtered[hi]); break
      case 'Escape':
        e.preventDefault()
        e.nativeEvent.stopImmediatePropagation() // prevent modal from also closing
        setOpen(false)
        setQuery('')
        triggerRef.current?.focus()
        break
      case 'Tab': setOpen(false); setQuery(''); break
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={() => { clickingTrigger.current = true }}
        onFocus={handleTriggerFocus}
        onClick={() => setOpen(o => !o)}
        className={`input flex items-center justify-between gap-2 text-left${open ? ' ring-2 ring-brand-500 border-transparent' : ''}`}
      >
        <span className={`flex-1 truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform${open ? ' rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            <input
              ref={inputRef}
              className="w-full bg-transparent px-2 py-1 text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Type to search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-2 text-sm text-slate-400">No matches</p>
              : filtered.map((opt, i) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    data-opt=""
                    onClick={() => pick(opt)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors
                      ${i === hi
                        ? 'bg-brand-900/40 text-brand-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
                      ${String(opt.value) === String(value) ? 'font-medium' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
