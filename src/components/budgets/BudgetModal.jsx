import { useState, useMemo } from 'react'
import { Trash2, Plus } from 'lucide-react'
import Modal from '@/components/Modal'
import { createBudget, updateBudget, deleteBudget, PERIOD_LABELS, currentPeriodRange } from '@/db/queries/budgets'
import { getCategories } from '@/db/queries/categories'
import { useQuery } from '@/hooks/useQuery'
import SearchableSelect from '@/components/SearchableSelect'

const today = new Date().toISOString().slice(0, 10)

function nextDayAfter(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function BudgetModal({ budget, budgets = [], onClose, onSave }) {
  const isNew = !budget.id
  const { data: categories = [] } = useQuery(() => getCategories())

  // All budget items sharing the same name/category/period — shown as multi-row in the modal
  const siblings = isNew ? [] : (budgets ?? [])
    .filter(b =>
      b.name        === budget.name        &&
      b.category_id === budget.category_id &&
      b.period      === budget.period      &&
      !b.archived
    )
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))

  const [form, setForm] = useState({
    name:        budget.name        ?? '',
    category_id: budget.category_id ?? '',
    period:      budget.period      ?? 'monthly',
    notes:       budget.notes       ?? ''
  })

  const [rows, setRows] = useState(() =>
    siblings.length > 0
      ? siblings.map(b => ({ id: b.id, amount: String(b.amount), start_date: b.start_date ?? today, end_date: b.end_date ?? '' }))
      : [{ id: null, amount: String(budget.amount ?? ''), start_date: budget.start_date ?? today, end_date: '' }]
  )

  const [error, setError] = useState('')

  const categoryOptions = useMemo(() => [
    { value: '', label: '— select a category —' },
    ...categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
  ], [categories])

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setRow = (idx, k, v) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, [k]: v } : r))

  function handleAddRow() {
    setRows(rs => {
      // Find the last row without an end date
      let lastOpenIdx = -1
      for (let i = rs.length - 1; i >= 0; i--) {
        if (!rs[i].end_date) { lastOpenIdx = i; break }
      }

      if (lastOpenIdx >= 0) {
        const [, periodEnd] = currentPeriodRange({ period: form.period })
        const newStart = nextDayAfter(periodEnd)
        return [
          ...rs.map((r, i) => i === lastOpenIdx ? { ...r, end_date: periodEnd } : r),
          { id: null, amount: rs[rs.length - 1].amount, start_date: newStart, end_date: '' }
        ]
      }

      return [...rs, { id: null, amount: rs[rs.length - 1]?.amount ?? '', start_date: today, end_date: '' }]
    })
  }

  function handleDeleteRow(idx) {
    const row = rows[idx]
    if (row.id) deleteBudget(row.id)
    setRows(rs => rs.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (!form.name.trim())  return setError('Name is required.')
    if (!form.category_id)  return setError('Please select a category.')

    for (let i = 0; i < rows.length; i++) {
      const r   = rows[i]
      const pfx = rows.length > 1 ? `Row ${i + 1}: ` : ''
      if (!r.amount || isNaN(Number(r.amount)) || Number(r.amount) <= 0)
        return setError(`${pfx}Enter a valid amount greater than 0.`)
      if (!r.start_date)
        return setError(`${pfx}Start date is required.`)
      if (r.end_date && r.end_date < r.start_date)
        return setError(`${pfx}End date must be on or after start date.`)
    }

    setError('')
    const shared = {
      name:        form.name.trim(),
      category_id: Number(form.category_id),
      period:      form.period,
      notes:       form.notes.trim() || null
    }

    for (const row of rows) {
      const data = { ...shared, amount: parseFloat(row.amount), start_date: row.start_date, end_date: row.end_date || null }
      if (row.id) updateBudget(row.id, data)
      else        createBudget(data)
    }

    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Budget Item' : 'Edit Budget Item'} onClose={onClose} maxWidth="max-w-lg">
      <div>
        <label className="label">Item Name *</label>
        <input
          className="input"
          placeholder="e.g. Rent, Groceries, Netflix…"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="label">Category *</label>
        <SearchableSelect
          value={form.category_id}
          onChange={v => set('category_id', v)}
          options={categoryOptions}
          placeholder="— select a category —"
        />
      </div>

      <div>
        <label className="label">Period *</label>
        <select className="input" value={form.period} onChange={e => set('period', e.target.value)}>
          {Object.entries(PERIOD_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Amount / date rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-3 pr-9 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>Amount *</span>
          <span>Start Date *</span>
          <span>End Date <span className="font-normal text-slate-400">(optional)</span></span>
        </div>

        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0.00"
                value={row.amount}
                onChange={e => setRow(idx, 'amount', e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={row.start_date}
                onChange={e => setRow(idx, 'start_date', e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={row.end_date}
                min={row.start_date}
                onChange={e => setRow(idx, 'end_date', e.target.value)}
              />
            </div>
            <div className="w-9 shrink-0 flex justify-center">
              {rows.length > 1 && (
                <button
                  onClick={() => handleDeleteRow(idx)}
                  className="btn-ghost p-2 text-slate-400 hover:text-red-500"
                  title="Remove row"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddRow}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 pt-1"
        >
          <Plus size={12} /> Add Row
        </button>
      </div>

      <div>
        <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
        <textarea
          className="input"
          rows={2}
          placeholder="Any notes about this budget item…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}
