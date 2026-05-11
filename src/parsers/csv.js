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
  generic: {
    name: 'Generic',
    detect: () => true,
    map: (row, headers) => {
      const dateCol   = headers.find(h => /date/i.test(h))
      const amtCol    = headers.find(h => /amount|amt/i.test(h))
      const descCol   = headers.find(h => /desc|memo|note|name/i.test(h))
      return {
        date:        normalizeDate(row[dateCol] ?? ''),
        amount:      parseAmount(row[amtCol] ?? 0),
        description: row[descCol] ?? JSON.stringify(row),
        payee:       row[descCol] ?? null
      }
    }
  }
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
  const rows = result.data
    .map(row => profile.map(row, headers))
    .filter(row => row.date && !isNaN(row.amount))

  return { profile: profile.name, rows }
}

function detectProfile(headers) {
  for (const key of ['chase', 'bofa', 'amex', 'capital_one']) {
    if (PROFILES[key].detect(headers)) return PROFILES[key]
  }
  return PROFILES.generic
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
