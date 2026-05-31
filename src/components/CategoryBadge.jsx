export default function CategoryBadge({ icon, name, color }) {
  if (!name) return <span className="text-xs text-slate-400 dark:text-slate-600 italic">Uncategorized</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800">
      {icon && <span>{icon}</span>}
      <span style={{ color: color ?? '#94a3b8' }} className="[mix-blend-mode:multiply] dark:[mix-blend-mode:normal]">{name}</span>
    </span>
  )
}
