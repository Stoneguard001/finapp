import { X, Pencil, Trash2 } from 'lucide-react'
import { fmt, fmtDate } from '@/lib/fmt'
import CategoryBadge from '@/components/CategoryBadge'

export default function TransactionDetailSheet({ transaction: tx, onClose, onEdit, onDelete }) {
  if (!tx) return null

  return (
    <>
      <div className="sm:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-xl">
        <div className="p-4 pb-0 flex items-center justify-center">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{tx.description}</div>
              {tx.payee && <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{tx.payee}</div>}
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 shrink-0 -mt-1 -mr-1">
              <X size={18} />
            </button>
          </div>

          <div className={`text-3xl font-bold font-mono ${tx.amount >= 0 ? 'text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
          </div>

          <div className="space-y-2.5 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
            <Row label="Date">{fmtDate(tx.date)}</Row>
            <Row label="Account">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tx.account_color ?? '#64748b' }} />
                {tx.account_name}
              </span>
            </Row>
            <Row label="Category">
              <CategoryBadge icon={tx.category_icon} name={tx.category_name} color={tx.category_color} />
            </Row>
            {(tx.budget_item_name || tx.implied_budget_name) ? (
              <Row label="Budget">
                {tx.budget_item_name
                  ? <span style={{ color: tx.budget_item_color ?? '#94a3b8' }}>{tx.budget_item_name}</span>
                  : <span className="text-slate-400 dark:text-slate-500">~ {tx.implied_budget_name}</span>}
              </Row>
            ) : null}
            {tx.tags?.length > 0 && (
              <Row label="Tags">
                <div className="flex flex-wrap gap-1">
                  {tx.tags.map(tag => (
                    <span key={tag.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ background: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </Row>
            )}
            {tx.is_transfer ? (
              <Row label="Type">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Transfer</span>
              </Row>
            ) : null}
          </div>

          <div className="flex gap-3 pt-1 pb-safe">
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={onEdit}
            >
              <Pencil size={15} /> Edit
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              onClick={onDelete}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 min-w-0">{children}</span>
    </div>
  )
}
