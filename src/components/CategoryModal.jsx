import { useState } from 'react'
import Modal from '@/components/Modal'
import { createCategory, updateCategory } from '@/db/queries/categories'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
  '#64748b', '#94a3b8',
]

const EMOJI_GROUPS = [
  { label: 'Money & Finance', emojis: ['💰', '💵', '💴', '💶', '💳', '🪙', '💹', '📈', '📉', '🏦', '🤑', '💎', '🧾', '📊'] },
  { label: 'Home & Housing',  emojis: ['🏠', '🏡', '🏢', '🏗️', '🔑', '🛋️', '🪟', '🚪', '🏘️', '🏰'] },
  { label: 'Food & Dining',   emojis: ['🛒', '🍽️', '🥡', '☕', '🍕', '🍔', '🌮', '🍣', '🥗', '🍷', '🍺', '🥐', '🛵'] },
  { label: 'Shopping',        emojis: ['🛍️', '👗', '👟', '👔', '📦', '🧴', '💄', '⌚', '🕶️', '🎒'] },
  { label: 'Transport',       emojis: ['🚗', '🚕', '🚌', '🚂', '✈️', '⛽', '🛞', '🚲', '🛴', '⚓', '🚢'] },
  { label: 'Health',          emojis: ['🏥', '💊', '🩺', '🧬', '💪', '🩹', '🧘', '🏋️', '🦷', '👁️'] },
  { label: 'Utilities & Bills', emojis: ['💡', '💧', '🔌', '📱', '🌐', '📡', '🔥', '❄️', '♻️', '📺'] },
  { label: 'Work & Business', emojis: ['💼', '📋', '🗂️', '🏛️', '⚖️', '🖥️', '🖨️', '📎', '✏️', '📌', '🤝', '📧'] },
  { label: 'Taxes & Legal',   emojis: ['🧾', '📄', '📝', '🏛️', '⚖️', '🗳️', '📮', '🔏', '📑'] },
  { label: 'Education',       emojis: ['📚', '🎓', '🏫', '✏️', '🔬', '🎨', '🖌️', '📐', '🧮'] },
  { label: 'Entertainment',   emojis: ['🎬', '🎮', '🎵', '🎭', '🎪', '🎲', '🎯', '🎸', '🎤', '📸'] },
  { label: 'Travel',          emojis: ['✈️', '🏖️', '🏔️', '🗺️', '🏕️', '🗼', '🌍', '🧳', '🏨', '🎡'] },
  { label: 'Personal Care',   emojis: ['💅', '✂️', '🛁', '🪒', '🧼', '🪥', '💇', '🧖'] },
  { label: 'Pets',            emojis: ['🐾', '🐕', '🐈', '🐠', '🐇', '🦜', '🐾', '🦮'] },
  { label: 'Gifts & Charity', emojis: ['🎁', '🎀', '❤️', '🤲', '🕊️', '🌱', '⭐'] },
  { label: 'Savings & Goals', emojis: ['🐷', '🏦', '🎯', '🔒', '💪', '🚀', '🌟', '🏆'] },
]

export default function CategoryModal({ category, onSave, onClose }) {
  const isNew = !category?.id
  const [name,     setName]     = useState(category?.name  ?? '')
  const [icon,     setIcon]     = useState(category?.icon  ?? '📦')
  const [color,    setColor]    = useState(category?.color ?? '#64748b')
  const [isIncome, setIsIncome] = useState(category?.is_income === 1)

  function handleSave() {
    if (!name.trim()) return
    const data = { name: name.trim(), icon: icon.trim() || '📦', color, is_income: isIncome ? 1 : 0 }
    if (isNew) createCategory(data)
    else       updateCategory(category.id, data)
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Category' : 'Edit Category'} onClose={onClose}>
      <div>
        <label className="label">Name *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Taxes" autoFocus />
      </div>

      <div>
        <label className="label">Icon</label>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl w-10 text-center">{icon || '📦'}</span>
          <span className="text-xs text-slate-500">Click any emoji below to select it</span>
        </div>
        <div className="h-48 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-2 space-y-3">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-wide mb-1 px-1">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map((e, i) => (
                  <button key={i} type="button"
                    onClick={() => setIcon(e)}
                    className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700
                      ${icon === e ? 'bg-brand-900/60 ring-1 ring-brand-500' : ''}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Color</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button"
              className={`w-6 h-6 rounded-full border-2 transition-colors ${color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent bg-transparent p-0"
            title="Custom color" />
        </div>
      </div>

      <div>
        <label className="label">Type</label>
        <div className="flex gap-3 mt-1">
          {[{ label: 'Expense', value: false }, { label: 'Income', value: true }].map(opt => (
            <button key={opt.label} type="button"
              onClick={() => setIsIncome(opt.value)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors
                ${isIncome === opt.value
                  ? 'border-brand-500 bg-brand-900/40 text-brand-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 flex-1">
          <span className="text-xl">{icon || '📦'}</span>
          <span className="text-sm font-medium" style={{ color }}>{name || 'Preview'}</span>
        </div>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>Save</button>
      </div>
    </Modal>
  )
}
