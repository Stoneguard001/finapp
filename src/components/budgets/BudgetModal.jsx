import { useState } from 'react'
import Modal from '@/components/Modal'
import { createBudget, updateBudget } from '@/db/queries/budgets'
import { getCategories } from '@/db/queries/categories'
import { useQuery } from '@/hooks/useQuery'

export default function BudgetModal({ budget, onClose, onSave }) {
  const isNew = !budget.id
  const { data: categories = [] } = useQuery(() => getCategories())

  const [form, setForm] = useState({
    name:        budget.name        ?? '',
    category_id: budget.category_id ?? '',
    amount:      budget.amount      ?? '',
    period:      budget.period === 'annual' ? 'annual' : 'monthly',
    notes:       budget.notes       ?? ''
  })
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.name.trim())  return setError('Name is required.')
    if (!form.category_id)  return setError('Please select a category.')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setError('Enter a valid amount greater than 0.')

    setError('')
    const data = {
      name:        form.name.trim(),
      category_id: Number(form.category_id),
      amount:      parseFloat(form.amount),
      period:      form.period,
      notes:       form.notes.trim() || null,
      start_date:  new Date().toISOString().slice(0, 10),
      end_date:    null
    }
    if (isNew) createBudget(data)
    else       updateBudget(budget.id, data)
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Budget Item' : 'Edit Budget Item'} onClose={onClose}>
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
        <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">— select a category —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Period *</label>
          <select className="input" value={form.period} onChange={e => set('period', e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
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
