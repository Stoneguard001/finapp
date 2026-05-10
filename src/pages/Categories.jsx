import { useState, useCallback } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { getCategories, getRules, createRule, deleteRule } from '@/db/queries/categories'
import { useQuery } from '@/hooks/useQuery'

export default function Categories() {
  const [refresh, setRefresh]     = useState(0)
  const [newPattern, setPattern]  = useState('')
  const [newCatId, setCatId]      = useState('')
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const { data: categories = [] } = useQuery(() => getCategories(), [refresh])
  const { data: rules = [] }      = useQuery(() => getRules(), [refresh])

  function addRule(e) {
    e.preventDefault()
    if (!newPattern || !newCatId) return
    createRule({ pattern: newPattern, category_id: Number(newCatId) })
    setPattern('')
    setCatId('')
    bump()
  }

  function removeRule(id) {
    deleteRule(id)
    bump()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-100">Categories &amp; Rules</h1>

      {/* Categories list */}
      <div className="card space-y-1">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50">
              <span>{c.icon}</span>
              <span className="text-sm text-slate-300">{c.name}</span>
              <span className="ml-auto w-2 h-2 rounded-full" style={{ background: c.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* Categorization rules */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-400">Auto-Categorization Rules</h2>
        <p className="text-xs text-slate-600">
          When a transaction description contains the keyword, it's automatically assigned that category.
        </p>

        {/* Add rule form */}
        <form onSubmit={addRule} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Keyword (e.g. NETFLIX)"
            value={newPattern}
            onChange={e => setPattern(e.target.value.toUpperCase())}
          />
          <select className="input w-44" value={newCatId} onChange={e => setCatId(e.target.value)}>
            <option value="">Category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button type="submit" className="btn-primary flex-shrink-0"><Plus size={14} /> Add</button>
        </form>

        {/* Rules table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="py-2 text-xs font-medium text-slate-500">Keyword</th>
              <th className="py-2 text-xs font-medium text-slate-500">Category</th>
              <th className="py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-slate-800/40">
                <td className="py-2 font-mono text-slate-300 text-xs">{r.pattern}</td>
                <td className="py-2 text-slate-400 text-xs">{r.category_name}</td>
                <td className="py-2">
                  <button onClick={() => removeRule(r.id)} className="btn-ghost p-1 text-red-500 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-slate-600">No rules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
