import { useState } from 'react'
import Modal from '@/components/Modal'
import { createTransaction, updateTransaction } from '@/db/queries/transactions'
import { setTransactionTags } from '@/db/queries/tags'
import TagPicker from '@/components/TagPicker'

export default function TransactionModal({ transaction, categories, accounts, tags, onClose, onSave }) {
  const isNew = !transaction.id
  const [form, setForm] = useState({
    account_id:  transaction.account_id ?? '',
    date:        transaction.date ?? new Date().toISOString().slice(0, 10),
    amount:      transaction.amount ?? '',
    description: transaction.description ?? '',
    category_id: transaction.category_id ?? '',
    is_transfer: transaction.is_transfer ?? 0,
    notes:       transaction.notes ?? ''
  })
  const [selectedTagIds, setSelectedTagIds] = useState(
    transaction.tags?.map(t => t.id) ?? []
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleCategoryChange(catId) {
    const cat = categories.find(c => c.id === Number(catId))
    const autoTransfer = cat?.name.toLowerCase() === 'transfer'
    setForm(f => ({
      ...f,
      category_id: catId,
      is_transfer: autoTransfer ? 1 : f.is_transfer
    }))
  }

  function handleSave() {
    if (!form.account_id || !form.date || form.amount === '') return
    const data = {
      ...form,
      amount:      parseFloat(form.amount),
      account_id:  Number(form.account_id),
      category_id: form.category_id ? Number(form.category_id) : null,
      is_transfer: form.is_transfer ? 1 : 0
    }
    const id = isNew ? createTransaction(data) : transaction.id
    if (!isNew) updateTransaction(id, data)
    setTransactionTags(id, selectedTagIds)
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Transaction' : 'Edit Transaction'} onClose={onClose}>
      <div>
        <label className="label">Account *</label>
        <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
          <option value="">Select account…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Amount *</label>
          <input type="number" step="0.01" className="input" placeholder="-50.00"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Description *</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={form.category_id} onChange={e => handleCategoryChange(e.target.value)}>
          <option value="">Uncategorized</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Transfer</span>
        <button
          type="button"
          onClick={() => set('is_transfer', form.is_transfer ? 0 : 1)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
            ${form.is_transfer ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
            ${form.is_transfer ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div>
        <label className="label">Tags</label>
        <TagPicker tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}
