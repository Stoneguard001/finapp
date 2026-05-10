import { useState } from 'react'
import Modal from '@/components/Modal'
import { createBudget, updateBudget, PERIODS, PERIOD_LABELS } from '@/db/queries/budgets'
import { getCategories } from '@/db/queries/categories'
import { useQuery } from '@/hooks/useQuery'

export default function BudgetModal({ budget, onClose, onSave }) {
  const isNew = !budget.id
  const { data: categories = [] } = useQuery(() => getCategories())

  const [form, setForm] = useState({
    name:        budget.name ?? '',
    category_id: budget.category_id ?? '',
    amount:      budget.amount ?? '',
    period:      budget.period ?? 'monthly',
    start_date:  budget.start_date ?? new Date().toISOString().slice(0, 10),
    end_date:    budget.end_date ?? '',
    notes:       budget.notes ?? ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.name || !form.amount) return
    const data = {
      ...form,
      amount:      parseFloat(form.amount),
      category_id: form.category_id ? Number(form.category_id) : null,
      end_date:    form.end_date || null
    }
    if (isNew) createBudget(data)
    else       updateBudget(budget.id, data)
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Budget' : 'Edit Budget'} onClose={onClose}>
      <div>
        <label className="label">Budget Name *</label>
        <input className="input" placeholder="Groceries, Netflix…" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount *</label>
          <input type="number" step="0.01" className="input" placeholder="200.00"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div>
          <label className="label">Period *</label>
          <select className="input" value={form.period} onChange={e => set('period', e.target.value)}>
            {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Category (optional)</label>
        <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">No category link</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">End Date (optional)</label>
          <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} placeholder="e.g. due 1st of month, renews March…"
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}
