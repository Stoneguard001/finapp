const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date     = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const fmt     = (n)    => currency.format(n ?? 0)
export const fmtDate = (iso)  => iso ? date.format(new Date(iso + 'T00:00:00')) : '—'
