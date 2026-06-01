import Papa from 'papaparse'

// Known institution CSV formats
const PROFILES = {
  chase: {
    name: 'Chase',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Post Date'),
    map: (row) => ({
      date:        normalizeDate(row['Transaction Date']),
      amount:      parseAmount(row['Amount']),
      description: row['Description'],
      payee:       row['Description']
    })
  },
  bofa: {
    name: 'Bank of America',
    detect: (headers) => headers.includes('Date') && headers.includes('Payee') && headers.includes('Amount'),
    map: (row) => ({
      date:        normalizeDate(row['Date']),
      amount:      parseAmount(row['Amount']),
      description: row['Description'] || row['Payee'],
      payee:       row['Payee']
    })
  },
  amex: {
    name: 'American Express',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && headers.includes('Amount') && headers.includes('Extended Details'),
    map: (row) => ({
      date:        normalizeDate(row['Date']),
      amount:      -parseAmount(row['Amount']),  // Amex shows positive = expense
      description: row['Description'],
      payee:       row['Description']
    })
  },
  capital_one: {
    name: 'Capital One',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Debit') && headers.includes('Credit'),
    map: (row) => {
      const debit  = parseAmount(row['Debit']  || 0)
      const credit = parseAmount(row['Credit'] || 0)
      return {
        date:        normalizeDate(row['Transaction Date']),
        amount:      credit > 0 ? credit : -debit,
        description: row['Description'],
        payee:       row['Description']
      }
    }
  },
}

function parseAmount(val) {
  if (val === null || val === undefined || val === '') return NaN
  const s = String(val).trim()
  const negative = s.startsWith('(') && s.endsWith(')')
  const n = parseFloat(s.replace(/[$,\s()]/g, ''))
  return negative ? -n : n
}

export function parseCSV(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() })
  if (result.errors.length && result.data.length === 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`)
  }

  const headers = result.meta.fields ?? []
  const profile = detectProfile(headers)

  if (profile) {
    const rows = result.data
      .map(row => profile.map(row, headers))
      .filter(row => row?.date && !isNaN(row.amount))
    return { profile: profile.name, rows, headers: null, rawRows: null }
  }

  // Generic: always require manual column assignment so nothing is silently misread
  return { profile: 'Generic', rows: null, headers, rawRows: result.data }
}

// Apply a saved (or newly confirmed) column mapping to raw CSV rows
export function applyColumnProfile(rawRows, mapping) {
  return rawRows.map(row => {
    const date        = normalizeDate(row[mapping.col_date] ?? '')
    const description = String(row[mapping.col_desc] ?? '').trim()
    const payee       = mapping.col_payee ? String(row[mapping.col_payee] ?? '').trim() || null : null

    let amount
    if (mapping.col_amount) {
      amount = parseAmount(row[mapping.col_amount])
    } else {
      const debit  = mapping.col_debit  ? (parseAmount(row[mapping.col_debit])  || 0) : 0
      const credit = mapping.col_credit ? (parseAmount(row[mapping.col_credit]) || 0) : 0
      amount = credit - debit
    }
    if (mapping.negate) amount = -amount

    return { date, description, payee, amount }
  }).filter(r => r.date && !isNaN(r.amount))
}

function detectProfile(headers) {
  for (const key of ['chase', 'bofa', 'amex', 'capital_one']) {
    if (PROFILES[key].detect(headers)) return PROFILES[key]
  }
  return null
}

function normalizeDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[\/\-\.]/)
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    const year = c < 100 ? c + 2000 : c
    return `${year}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`
  }
  // Handle "Month DD, YYYY" (e.g. "May 11, 2026")
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}
