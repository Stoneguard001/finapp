import { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import Modal from '@/components/Modal'
import { createTransaction, updateTransaction, getTransactionSplits, setTransactionSplits } from '@/db/queries/transactions'
import { setTransactionTags } from '@/db/queries/tags'
import { getBudgets } from '@/db/queries/budgets'
import { useQuery } from '@/hooks/useQuery'
import TagPicker from '@/components/TagPicker'
import SearchableSelect from '@/components/SearchableSelect'
import { fmt } from '@/lib/fmt'

export default function TransactionModal({ transaction, categories, accounts, tags, onClose, onSave }) {
  const isNew = !transaction.id
  const { data: allBudgets = [] } = useQuery(() => getBudgets())

  const [form, setForm] = useState({
    account_id:     transaction.account_id     ?? (isNew ? (localStorage.getItem('txn_lastAccount') ?? '') : ''),
    date:           transaction.date           ?? new Date().toISOString().slice(0, 10),
    amount:         transaction.amount         ?? '',
    description:    transaction.description    ?? '',
    category_id:    transaction.category_id    ?? '',
    is_transfer:    transaction.is_transfer    ?? 0,
    notes:          transaction.notes          ?? '',
    budget_item_id: transaction.budget_item_id ?? ''
  })
  const [selectedTagIds, setSelectedTagIds] = useState(
    transaction.tags?.map(t => t.id) ?? []
  )

  // Split state
  const [isSplit, setIsSplit] = useState(() => !isNew && (transaction.split_count ?? 0) > 0)
  const [splits, setSplits] = useState(() => {
    if (!isNew && (transaction.split_count ?? 0) > 0) {
      return getTransactionSplits(transaction.id).map(s => ({
        category_id:    String(s.category_id ?? ''),
        budget_item_id: String(s.budget_item_id ?? ''),
        amount:         String(s.amount),
        note:           s.note ?? ''
      }))
    }
    return [{ category_id: '', budget_item_id: '', amount: '', note: '' }]
  })

  const totalAmount = parseFloat(form.amount) || 0
  const splitSum    = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const remaining   = Math.round((totalAmount - splitSum) * 100) / 100

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleCategoryChange(catId) {
    const cat = categories.find(c => c.id === Number(catId))
    const autoTransfer = cat?.name.toLowerCase() === 'transfer'
    setForm(f => ({
      ...f,
      category_id:    catId,
      budget_item_id: '',
      is_transfer:    autoTransfer ? 1 : f.is_transfer
    }))
  }

  function toggleSplit() {
    if (isSplit) {
      const first = splits[0]
      setForm(f => ({
        ...f,
        category_id:    first?.category_id    ?? '',
        budget_item_id: first?.budget_item_id ?? ''
      }))
      setSplits([{ category_id: '', budget_item_id: '', amount: '', note: '' }])
    } else {
      setSplits([{
        category_id:    String(form.category_id ?? ''),
        budget_item_id: String(form.budget_item_id ?? ''),
        amount:         String(form.amount ?? ''),
        note:           ''
      }])
    }
    setIsSplit(v => !v)
  }

  function updateSplit(i, field, value) {
    setSplits(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'amount' && next.length === 2) {
        const edited = parseFloat(value)
        if (!isNaN(edited)) {
          const otherIdx = i === 0 ? 1 : 0
          const otherAmt = Math.round((totalAmount - edited) * 100) / 100
          next[otherIdx] = { ...next[otherIdx], amount: String(otherAmt) }
        }
      }
      return next
    })
  }

  function addSplit() {
    setSplits(prev => [...prev, {
      category_id:    '',
      budget_item_id: '',
      amount:         remaining !== 0 ? String(remaining) : '',
      note:           ''
    }])
  }

  function removeSplit(i) {
    setSplits(prev => prev.filter((_, idx) => idx !== i))
  }

  const accountOptions = useMemo(() => [
    { value: '', label: 'Select account…' },
    ...accounts.map(a => ({ value: a.id, label: a.name }))
  ], [accounts])

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Uncategorized' },
    ...categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
  ], [categories])

  const categoryBudgets = form.category_id
    ? allBudgets.filter(b => b.category_id === Number(form.category_id))
    : []

  const splitBalanced = Math.abs(remaining) < 0.005
  const canSave = form.account_id && form.date && form.amount !== '' && (!isSplit || splitBalanced)

  function handleSave() {
    if (!canSave) return
    const data = {
      ...form,
      amount:         parseFloat(form.amount),
      account_id:     Number(form.account_id),
      category_id:    isSplit ? null : (form.category_id    ? Number(form.category_id)    : null),
      budget_item_id: isSplit ? null : (form.budget_item_id ? Number(form.budget_item_id) : null),
      is_transfer:    form.is_transfer ? 1 : 0
    }
    const id = isNew ? createTransaction(data) : transaction.id
    if (!isNew) updateTransaction(id, data)
    setTransactionTags(id, selectedTagIds)
    setTransactionSplits(id, isSplit
      ? splits.map(s => ({
          category_id:    s.category_id    ? Number(s.category_id)    : null,
          budget_item_id: s.budget_item_id ? Number(s.budget_item_id) : null,
          amount:         parseFloat(s.amount),
          note:           s.note || null
        }))
      : []
    )
    localStorage.setItem('txn_lastAccount', String(form.account_id))
    onSave()
  }

  return (
    <Modal title={isNew ? 'Add Transaction' : 'Edit Transaction'} onClose={onClose}>
      <div>
        <label className="label">Account *</label>
        <SearchableSelect
          value={form.account_id}
          onChange={v => set('account_id', v)}
          options={accountOptions}
          placeholder="Select account…"
        />
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

      {/* Category / Splits section */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label m-0">{isSplit ? 'Splits' : 'Category'}</label>
          <button
            type="button"
            onClick={toggleSplit}
            className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
          >
            {isSplit ? '← Single category' : 'Split →'}
          </button>
        </div>

        {isSplit ? (
          <div className="space-y-2">
            {splits.map((s, i) => (
              <SplitRow
                key={i}
                split={s}
                idx={i}
                categories={categories}
                categoryOptions={categoryOptions}
                allBudgets={allBudgets}
                onUpdate={updateSplit}
                onRemove={removeSplit}
              />
            ))}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                onClick={addSplit}
              >
                <Plus size={12} /> Add split
              </button>
              <span className={`text-xs font-mono ${splitBalanced ? 'text-brand-400' : 'text-red-400'}`}>
                {splitBalanced
                  ? '✓ Balanced'
                  : `${remaining > 0 ? '+' : ''}${fmt(remaining)} remaining`}
              </span>
            </div>
          </div>
        ) : (
          <>
            <SearchableSelect
              value={form.category_id}
              onChange={v => handleCategoryChange(v)}
              options={categoryOptions}
              placeholder="Uncategorized"
            />
            {categoryBudgets.length > 0 && (
              <div className="mt-3">
                <label className="label">Budget Item <span className="text-slate-400 font-normal">(optional)</span></label>
                <select className="input" value={form.budget_item_id} onChange={e => set('budget_item_id', e.target.value)}>
                  <option value="">— none —</option>
                  {categoryBudgets.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.period})</option>
                  ))}
                </select>
                {form.budget_item_id && (() => {
                  const linked = categoryBudgets.find(b => b.id === Number(form.budget_item_id))
                  const hints = { annual: '12 months', semi_annual: '6 months', quarterly: '3 months' }
                  const hint  = linked ? hints[linked.period] : null
                  return hint
                    ? <p className="text-xs text-slate-400 mt-1">This charge will be amortized across {hint} in the monthly budget view.</p>
                    : null
                })()}
              </div>
            )}
          </>
        )}
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
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!canSave}
          title={isSplit && !splitBalanced ? 'Splits must balance to the transaction amount' : undefined}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

function SplitRow({ split, idx, categories, categoryOptions, allBudgets, onUpdate, onRemove }) {
  const catId = split.category_id ? Number(split.category_id) : null
  const catBudgets = catId ? allBudgets.filter(b => b.category_id === catId) : []

  return (
    <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={split.category_id}
            onChange={v => { onUpdate(idx, 'category_id', v); onUpdate(idx, 'budget_item_id', '') }}
            options={categoryOptions}
            placeholder="Category…"
          />
        </div>
        <input
          type="number"
          step="0.01"
          className="input w-28 text-sm"
          placeholder="0.00"
          value={split.amount}
          onChange={e => onUpdate(idx, 'amount', e.target.value)}
        />
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="btn-ghost p-1.5 text-slate-400 hover:text-red-500 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      {catBudgets.length > 0 && (
        <select
          className="input text-xs py-1"
          value={split.budget_item_id}
          onChange={e => onUpdate(idx, 'budget_item_id', e.target.value)}
        >
          <option value="">— budget item —</option>
          {catBudgets.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.period})</option>
          ))}
        </select>
      )}
    </div>
  )
}
