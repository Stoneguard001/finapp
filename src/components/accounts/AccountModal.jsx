import { useState } from 'react'
import Modal from '@/components/Modal'
import { createAccount, updateAccount } from '@/db/queries/accounts'

const TYPES = ['checking', 'savings', 'credit', 'investment', 'loan']
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6']

export default function AccountModal({ account, onClose, onSave }) {
  const isNew = !account.id
  const [form, setForm] = useState({
    name:        account.name ?? '',
    institution: account.institution ?? '',
    type:        account.type ?? 'checking',
    currency:    account.currency ?? 'USD',
    color:       account.color ?? '#22c55e'
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.name) return
    if (isNew) createAccount(form)
    else       updateAccount(account.id, form)
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Account' : 'Edit Account'} onClose={onClose}>
      <div>
        <label className="label">Account Name *</label>
        <input className="input" placeholder="Chase Checking" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Institution</label>
        <input className="input" placeholder="Chase, Bank of America…" value={form.institution} onChange={e => set('institution', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input" value={form.currency} onChange={e => set('currency', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Color</label>
        <div className="flex gap-2 mt-1">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}
