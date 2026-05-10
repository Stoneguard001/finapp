import { useState, useCallback } from 'react'
import { Search, Pencil, Trash2, X } from 'lucide-react'
import { getTransactions, deleteTransaction } from '@/db/queries/transactions'
import { getCategories } from '@/db/queries/categories'
import { getAccounts } from '@/db/queries/accounts'
import { getTags } from '@/db/queries/tags'
import { useQuery } from '@/hooks/useQuery'
import { fmt, fmtDate } from '@/lib/fmt'
import CategoryBadge from '@/components/CategoryBadge'
import TransactionModal from '@/components/transactions/TransactionModal'

export default function Transactions() {
  const [search, setSearch]       = useState('')
  const [filterTag, setFilterTag] = useState(null)
  const [editing, setEditing]     = useState(null)
  const [refresh, setRefresh]     = useState(0)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const { data: transactions = [] } = useQuery(() => getTransactions({ limit: 1000 }), [refresh])
  const { data: categories = [] }   = useQuery(() => getCategories())
  const { data: accounts = [] }     = useQuery(() => getAccounts())
  const { data: tags = [] }         = useQuery(() => getTags(), [refresh])

  const filtered = transactions.filter(t => {
    if (search) {
      const q = search.toLowerCase()
      const matchesText =
        t.description.toLowerCase().includes(q) ||
        (t.payee ?? '').toLowerCase().includes(q) ||
        (t.category_name ?? '').toLowerCase().includes(q) ||
        t.tags.some(tag => tag.name.toLowerCase().includes(q))
      if (!matchesText) return false
    }
    if (filterTag && !t.tags.some(tag => tag.id === filterTag)) return false
    return true
  })

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    deleteTransaction(id)
    bump()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Transactions</h1>
        <button className="btn-primary" onClick={() => setEditing({})}>+ Add</button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search transactions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Filter by tag:</span>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white transition-opacity"
              style={{ background: tag.color, opacity: filterTag && filterTag !== tag.id ? 0.35 : 1 }}
            >
              {tag.name}
              {filterTag === tag.id && <X size={10} />}
            </button>
          ))}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-500">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500">Description</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500">Account</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500">Category</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Amount</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-600">No transactions found</td></tr>
            )}
            {filtered.map(tx => (
              <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="text-slate-200 truncate">{tx.description}</div>
                  {tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tx.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ background: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: tx.account_color ?? '#64748b' }} />
                    {tx.account_name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge icon={tx.category_icon} name={tx.category_name} color={tx.category_color} />
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${tx.amount >= 0 ? 'text-brand-400' : 'text-slate-200'}`}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditing(tx)}      className="btn-ghost p-1"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(tx.id)} className="btn-ghost p-1 text-red-500 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <TransactionModal
          transaction={editing}
          categories={categories}
          accounts={accounts}
          tags={tags}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
