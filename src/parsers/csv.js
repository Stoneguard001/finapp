import Papa from 'papaparse'

// Known institution CSV formats
const PROFILES = {
  chase: {
    name: 'Chase',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Post Date'),
    map: (row) => ({
      date:        normalizeDate(row['Transaction Date']),
      amount:      parseFloat(row['Amount']),
      description: row['Description'],
      payee:       row['Description']
    })
  },
  bofa: {
    name: 'Bank of America',
    detect: (headers) => headers.includes('Date') && headers.includes('Payee') && headers.includes('Amount'),
    map: (row) => ({
      date:        normalizeDate(row['Date']),
      amount:      parseFloat(row['Amount']),
      description: row['Description'] || row['Payee'],
      payee:       row['Payee']
    })
  },
  amex: {
    name: 'American Express',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && headers.includes('Amount') && headers.includes('Extended Details'),
    map: (row) => ({
      date:        normalizeDate(row['Date']),
      amount:      -parseFloat(row['Amount']),  // Amex shows positive = expense
      description: row['Description'],
      payee:       row['Description']
    })
  },
  capital_one: {
    name: 'Capital One',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Debit') && headers.includes('Credit'),
    map: (row) => {
      const debit  = parseFloat(row['Debit']  || 0)
      const credit = parseFloat(row['Credit'] || 0)
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
        amount:      parseFloat(row[amtCol] ?? 0),
        description: row[descCol] ?? JSON.stringify(row),
        payee:       row[descCol] ?? null
      }
    }
  }
}

export function parseCSV(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, trimHeaders: true })
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
  // Handle MM/DD/YYYY, M/D/YY, YYYY-MM-DD, MM-DD-YYYY
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[\/\-]/)
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    const year = c < 100 ? c + 2000 : c
    return `${year}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`
  }
  return null
}
