import { useState, useCallback } from 'react'
import { Plus, Pencil, Archive } from 'lucide-react'
import { getAccounts, archiveAccount } from '@/db/queries/accounts'
import { query } from '@/db/database'
import { useQuery } from '@/hooks/useQuery'
import { fmt } from '@/lib/fmt'
import AccountModal from '@/components/accounts/AccountModal'

export default function Accounts() {
  const [editing, setEditing] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const { data: accounts = [] } = useQuery(() => {
    const rows = getAccounts()
    return rows.map(a => {
      const [bal] = query(
        `SELECT COALESCE(SUM(amount),0) as balance FROM transactions WHERE account_id=?`,
        [a.id]
      )
      return { ...a, balance: bal?.balance ?? 0 }
    })
  }, [refresh])

  function handleArchive(id) {
    if (!confirm('Archive this account? Transactions will be kept.')) return
    archiveAccount(id)
    bump()
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.type === 'credit' ? 0 : a.balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Accounts</h1>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Account</button>
      </div>

      <div className="card inline-block">
        <div className="text-xs text-slate-500">Total Balance (non-credit)</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmt(totalBalance)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(a => (
          <div key={a.id} className="card space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{a.name}</div>
                  {a.institution && <div className="text-xs text-slate-500">{a.institution}</div>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(a)}       className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" title="Edit account"><Pencil  size={13} /></button>
                <button onClick={() => handleArchive(a.id)} className="btn-ghost p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" title="Archive account"><Archive size={13} /></button>
              </div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${a.balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-400'}`}>
                {fmt(a.balance)}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-600 capitalize mt-0.5">{a.type} · {a.currency}</div>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-500">No accounts yet.</p>
          <button className="btn-primary mt-3" onClick={() => setEditing({})}><Plus size={14} /> Add your first account</button>
        </div>
      )}

      {editing !== null && (
        <AccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
