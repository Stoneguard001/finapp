import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Items whose xStart values are within this many PDF units are merged into the same cell.
// Intentionally small — we rely on column clustering, not width, to group things.
const CELL_GAP = 4
const COL_TOLERANCE = 30

export async function parsePDF(buffer) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const rawRows = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    const byY = {}
    for (const item of content.items) {
      if (!item.str.trim()) continue
      const y = Math.round(item.transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push({ x: item.transform[4], text: item.str })
    }

    for (const y of Object.keys(byY).sort((a, b) => b - a)) {
      const items = byY[y].sort((a, b) => a.x - b.x)
      const cells = []
      let cell = { xStart: items[0].x, text: items[0].text }
      for (let j = 1; j < items.length; j++) {
        // Use xStart gap only — item.width is unreliable across PDF encodings
        if (items[j].x - items[j - 1].x < CELL_GAP) {
          cell.text += items[j].text
        } else {
          cells.push({ xStart: cell.xStart, text: cell.text.trim() })
          cell = { xStart: items[j].x, text: items[j].text }
        }
      }
      cells.push({ xStart: cell.xStart, text: cell.text.trim() })
      rawRows.push(cells)
    }
  }

  console.log('[pdf] rawRows (items per line, with x positions):', rawRows)

  if (!rawRows.length) return { profile: 'pdf_raw', grid: [], numCols: 0, rows: [] }

  const allXStarts = rawRows.flatMap(r => r.map(c => c.xStart))
  const colBoundaries = clusterValues(allXStarts, COL_TOLERANCE)
  const numCols = colBoundaries.length

  console.log('[pdf] detected column boundaries:', colBoundaries)

  const grid = rawRows.map(row => {
    const cells = Array(numCols).fill('')
    for (const cell of row) {
      const colIdx = colBoundaries.findIndex(
        ([min, max]) => cell.xStart >= min - COL_TOLERANCE / 2 && cell.xStart <= max + COL_TOLERANCE / 2
      )
      if (colIdx >= 0) {
        cells[colIdx] = cells[colIdx] ? cells[colIdx] + ' ' + cell.text : cell.text
      }
    }
    return cells
  }).filter(r => r.some(c => c.trim()))

  console.log('[pdf] grid:', grid)

  return { profile: 'pdf_raw', grid, numCols, rows: [] }
}

function clusterValues(values, tolerance) {
  if (!values.length) return []
  const sorted = [...new Set(values.map(Math.round))].sort((a, b) => a - b)
  const clusters = []
  let min = sorted[0], max = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - min <= tolerance) {
      max = sorted[i]
    } else {
      clusters.push([min, max])
      min = max = sorted[i]
    }
  }
  clusters.push([min, max])
  return clusters
}
