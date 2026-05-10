import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { createTag } from '@/db/queries/tags'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
]

export default function TagPicker({ tags, selected, onChange }) {
  const [allTags, setAllTags] = useState(tags)
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [newColor, setNewColor] = useState(PRESET_COLORS[5])
  const ref = useRef(null)

  useEffect(() => setAllTags(tags), [tags])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedTags = allTags.filter(t => selected.includes(t.id))
  const filtered = allTags.filter(t =>
    !selected.includes(t.id) &&
    t.name.toLowerCase().includes(input.toLowerCase())
  )
  const canCreate = input.trim() &&
    !allTags.find(t => t.name.toLowerCase() === input.trim().toLowerCase())

  function toggle(tagId) {
    onChange(selected.includes(tagId)
      ? selected.filter(id => id !== tagId)
      : [...selected, tagId]
    )
  }

  function handleCreate() {
    const name = input.trim()
    const id = createTag(name, newColor)
    const newTag = { id, name, color: newColor }
    setAllTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
    onChange([...selected, id])
    setInput('')
    setOpen(false)
  }

  const showDropdown = open && (filtered.length > 0 || canCreate)

  return (
    <div ref={ref} className="relative">
      <div
        className="input min-h-[38px] flex flex-wrap gap-1 cursor-text"
        onClick={() => { setOpen(true) }}
      >
        {selectedTags.map(t => (
          <span
            key={t.id}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ background: t.color }}
          >
            {t.name}
            <button
              type="button"
              className="hover:opacity-70 leading-none"
              onClick={e => { e.stopPropagation(); toggle(t.id) }}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500 flex-1 min-w-[80px]"
          placeholder={selectedTags.length ? '' : 'Add tags…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && canCreate) { e.preventDefault(); handleCreate() }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {filtered.map(t => (
            <button
              key={t.id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-sm text-slate-200"
              onClick={() => { toggle(t.id); setInput('') }}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}

          {canCreate && (
            <div className={`px-3 py-2 ${filtered.length > 0 ? 'border-t border-slate-700' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-400">Create</span>
                <span className="text-sm text-slate-200 font-medium truncate">"{input.trim()}"</span>
                <div className="ml-auto flex gap-1 flex-shrink-0">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`w-4 h-4 rounded-full border-2 transition-colors ${newColor === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                onClick={handleCreate}
              >
                <Plus size={11} /> Add tag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
