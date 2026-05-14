import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function YearPicker({ year, onChange, maxYear }) {
  const limit = maxYear ?? new Date().getFullYear()
  const atMax = year >= limit
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(year - 1)} className="btn-ghost p-1" title="Previous year">
        <ChevronLeft size={18} />
      </button>
      <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 w-16 text-center select-none">
        {year}
      </span>
      <button onClick={() => onChange(year + 1)} className="btn-ghost p-1" disabled={atMax} title="Next year">
        <ChevronRight size={18} className={atMax ? 'text-slate-300 dark:text-slate-700' : ''} />
      </button>
    </div>
  )
}
