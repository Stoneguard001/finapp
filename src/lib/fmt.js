const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtDate = (iso) => iso ? date.format(new Date(iso + 'T00:00:00')) : '—'
