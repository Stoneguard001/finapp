import schemaSQL    from '@/db/schema.sql?raw'
import schemaSeedSQL from '@/db/schema-seed.sql?raw'
import { createFreshDatabase } from '@/db/database'

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}
function randDay(year, month, min = 1, max = null) {
  return Math.floor(rand(min, (max ?? daysInMonth(year, month)) + 1))
}

export async function generateSampleDb() {
  const db = await createFreshDatabase()

  db.run(schemaSQL)
  db.run(schemaSeedSQL)

  const cats = {}
  db.exec('SELECT id, name FROM categories')[0]?.values
    .forEach(([id, name]) => { cats[name] = id })

  function insertAccount(name, institution, type, color) {
    db.run(
      `INSERT INTO accounts (name, institution, type, color) VALUES (?,?,?,?)`,
      [name, institution, type, color]
    )
    return db.exec('SELECT last_insert_rowid()')[0].values[0][0]
  }

  const checking = insertAccount('Checking',    'Maplewood Bank',   'checking', '#22c55e')
  const credit   = insertAccount('Credit Card', 'Crestline Credit', 'credit',   '#3b82f6')
  const savings  = insertAccount('Savings',     'Maplewood Bank',   'savings',  '#f59e0b')

  function tx(accountId, date, amount, description, category) {
    db.run(
      `INSERT INTO transactions (account_id, date, amount, description, category_id)
       VALUES (?,?,?,?,?)`,
      [accountId, date, amount, description, cats[category] ?? null]
    )
  }

  function txTransfer(fromId, toId, date, amount, description) {
    db.run(
      `INSERT INTO transactions (account_id, date, amount, description, category_id, is_transfer)
       VALUES (?,?,?,?,?,1)`,
      [fromId, date, -amount, description, cats['Transfer']]
    )
    db.run(
      `INSERT INTO transactions (account_id, date, amount, description, category_id, is_transfer)
       VALUES (?,?,?,?,?,1)`,
      [toId, date, amount, description, cats['Transfer']]
    )
  }

  const now = new Date()
  for (let i = 2; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    const last  = daysInMonth(year, month)

    // ~$60k gross → ~$3,950/month take-home → ~$1,975/paycheck bi-weekly
    tx(checking, isoDate(year, month, 1),  rand(1925, 2025), 'DIRECT DEPOSIT PAYROLL', 'Income')
    tx(checking, isoDate(year, month, 15), rand(1925, 2025), 'DIRECT DEPOSIT PAYROLL', 'Income')

    // Fixed monthly bills — rent ~25% of gross
    tx(checking, isoDate(year, month, 1),  -rand(975, 1050), 'RENT PAYMENT',           'Housing')
    tx(checking, isoDate(year, month, 5),  -rand(60, 95),    'CITY UTILITIES',         'Utilities')
    tx(checking, isoDate(year, month, 8),  -59.99,           'COMCAST INTERNET',       'Internet/Phone')
    tx(checking, isoDate(year, month, 12), -85.00,           'STATE FARM INSURANCE',   'Insurance')
    tx(checking, isoDate(year, month, 20), -rand(250, 450),  'CRESTLINE AUTOPAY PAYMENT', 'Transfer')

    txTransfer(checking, savings, isoDate(year, month, 2), 150, 'TRANSFER TO SAVINGS')

    // Subscriptions — scaled back, no premium tier
    tx(credit, isoDate(year, month, 3),  -15.99, 'NETFLIX.COM',    'Subscriptions')
    tx(credit, isoDate(year, month, 3),  -9.99,  'SPOTIFY USA',    'Subscriptions')

    // Groceries — weekly, modest
    const grocers = ['KROGER', "TRADER JOE'S", 'WALMART GROCERY', 'ALDI', 'SAFEWAY']
    for (let w = 0; w < 4; w++) {
      tx(credit, isoDate(year, month, Math.min(3 + w * 7, last)), -rand(50, 95), pick(grocers), 'Groceries')
    }

    // Dining out — 3–5 times, mostly fast casual
    const diners = [
      'CHIPOTLE', 'PANERA BREAD', "MCDONALD'S", 'CHICK-FIL-A',
      'SUBWAY', 'DOORDASH', 'STARBUCKS', 'PANDA EXPRESS', 'FIVE GUYS',
    ]
    for (let n = 0; n < Math.floor(rand(3, 6)); n++) {
      tx(credit, isoDate(year, month, randDay(year, month)), -rand(9, 32), pick(diners), 'Dining Out')
    }

    // Gas — 2 fill-ups/month
    const stations = ['SHELL', 'CHEVRON', 'EXXON', 'BP GAS STATION', 'CIRCLE K']
    for (let n = 0; n < 2; n++) {
      tx(credit, isoDate(year, month, randDay(year, month)), -rand(32, 52), pick(stations), 'Transportation')
    }

    // Shopping — 1–2 times, modest amounts
    const shops = ['AMAZON.COM', 'TARGET', 'WALMART', 'MARSHALLS', 'TJ MAXX']
    for (let n = 0; n < Math.floor(rand(1, 3)); n++) {
      tx(credit, isoDate(year, month, randDay(year, month)), -rand(15, 75), pick(shops), 'Shopping')
    }

    // Entertainment — 1–2 times
    const fun = ['AMC THEATRES', 'STEAM GAMES', 'BOWLING ALLEY', 'REDBOX']
    for (let n = 0; n < Math.floor(rand(1, 3)); n++) {
      tx(credit, isoDate(year, month, randDay(year, month)), -rand(10, 40), pick(fun), 'Entertainment')
    }

    // Personal care — occasional
    if (Math.random() > 0.4) {
      tx(credit, isoDate(year, month, randDay(year, month)),
        -rand(12, 45), pick(['GREAT CLIPS', 'CVS PHARMACY', 'WALGREENS', 'DOLLAR TREE']), 'Personal Care')
    }

    // Healthcare — occasional
    if (Math.random() > 0.5) {
      tx(credit, isoDate(year, month, randDay(year, month)),
        -rand(15, 60), pick(['CVS PHARMACY', 'WALGREENS', 'URGENT CARE']), 'Healthcare')
    }

    // Pets — occasional
    if (Math.random() > 0.65) {
      tx(credit, isoDate(year, month, randDay(year, month)),
        -rand(20, 55), pick(['PETSMART', 'PETCO']), 'Pets')
    }
  }

  const data = db.export()
  db.close()
  return data
}

export function downloadSampleDb() {
  return generateSampleDb().then(data => {
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'finapp-sample.sqlite'
    a.click()
    URL.revokeObjectURL(url)
  })
}
