import * as XLSX from 'xlsx'
import { parseCSV } from './csv'

export function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to CSV then reuse CSV parser (handles format detection)
  const csv = XLSX.utils.sheet_to_csv(sheet)
  return parseCSV(csv)
}
