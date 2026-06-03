import { useState, useCallback, useEffect, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, X, BookmarkPlus } from 'lucide-react'
import { parseCSV, applyColumnProfile } from '@/parsers/csv'
import { parseExcel } from '@/parsers/excel'
import { parsePDF } from '@/parsers/pdf'
import PdfMapper from '@/components/PdfMapper'
import ColumnMapper from '@/components/ColumnMapper'
import { getAccounts } from '@/db/queries/accounts'
import { getCategories, getRules, applyRules } from '@/db/queries/categories'
import { findFuzzyDuplicates, createTransaction } from '@/db/queries/transactions'
import { setTransactionTags } from '@/db/queries/tags'
import { run } from '@/db/database'
import { getAccountImportProfile, saveAccountImportProfile } from '@/db/queries/importProfiles'
import { useQuery } from '@/hooks/useQuery'
import { fmtDate } from '@/lib/fmt'
import { useCurrency } from '@/context/CurrencyContext'
import CategoryBadge from '@/components/CategoryBadge'
import RuleModal from '@/components/RuleModal'
import { getTags } from '@/db/queries/tags'

export default function ImportPage() {
  const { fmt } = useCurrency()
  const [step, setStep]               = useState('upload')
  const [accountId, setAccountId]     = useState('')
  const [rows, setRows]               = useState([])
  const [profile, setProfile]         = useState('')
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [pdfData, setPdfData]         = useState(null)
  const [rawImport, setRawImport]     = useState(null)
  const [savingRuleFor, setSavingRuleFor] = useState(null)
  const [excluded, setExcluded]       = useState(new Set())
  const [dupIndices, setDupIndices]   = useState(new Set())
  const selectAllRef                  = useRef(null)
  const rowsRef                       = useRef(rows)
  rowsRef.current = rows

  const { data: accounts = [] }   = useQuery(() => getAccounts())
  const { data: categories = [] } = useQuery(() => getCategories())
  const { data: rules = [] }      = useQuery(() => getRules())
  const { data: tags = [] }       = useQuery(() => getTags())

  // Re-run fuzzy dup check whenever the account or step changes
  useEffect(() => {
    if (!accountId || step !== 'preview' || rowsRef.current.length === 0) {
      setDupIndices(new Set())
      return
    }
    const dups = new Set()
    rowsRef.current.forEach((row, i) => {
      if (findFuzzyDuplicates(Number(accountId), row.date, row.amount, row.description).length > 0)
        dups.add(i)
    })
    setDupIndices(dups)
    setExcluded(dups)
  }, [accountId, step])

  // Keep select-all checkbox indeterminate state in sync
  useEffect(() => {
    if (!selectAllRef.current) return
    const includedCount = rows.length - excluded.size
    selectAllRef.current.indeterminate = includedCount > 0 && excluded.size > 0
  }, [excluded, rows.length])

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0] ?? e.target.files?.[0]
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      let parsed
      if (ext === 'csv' || ext === 'txt') {
        parsed = parseCSV(await file.text())
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsed = parseExcel(await file.arrayBuffer())
      } else if (ext === 'pdf') {
        const pdf = await parsePDF(await file.arrayBuffer())
        if (!pdf.grid || pdf.grid.length === 0) {
          throw new Error('No text could be extracted from this PDF. It may be a scanned image.')
        }
        setPdfData({ grid: pdf.grid, numCols: pdf.numCols })
        setStep('map')
        return
      } else {
        throw new Error(`Unsupported file type: .${ext}`)
      }
      if (parsed.rows !== null) {
        // Known institution format — go straight to preview
        const enriched = parsed.rows.map(r => {
          const match = applyRules(r.description ?? '', rules)
          return { ...r, category_id: match?.category_id ?? null, budget_item_id: match?.budget_item_id ?? null, tag_ids: match?.tag_ids ?? [] }
        })
        setRows(enriched)
        setExcluded(new Set())
        setDupIndices(new Set())
        setProfile(parsed.profile)
        setStep('preview')
      } else {
        // Generic CSV — always show column mapper (pre-populate from saved profile if available)
        const savedProfile = accountId ? getAccountImportProfile(Number(accountId)) : null
        setRawImport({ headers: parsed.headers, rawRows: parsed.rawRows, savedProfile: savedProfile ?? null })
        setStep('col-map')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [rules])

  function updateRowCategory(idx, category_id) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, category_id } : r))
  }

  function handleRuleSaved(newRule) {
    setSavingRuleFor(null)
    setRows(prev => prev.map(r => {
      if (r.category_id) return r
      const match = applyRules(r.description, [newRule, ...rules])
      return match ? { ...r, category_id: match.category_id, budget_item_id: match.budget_item_id ?? null, tag_ids: match.tag_ids } : r
    }))
  }

  function toggleExcluded(i) {
    setExcluded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleAll() {
    const includedCount = rows.length - excluded.size
    if (includedCount > 0) {
      // exclude all
      setExcluded(new Set(rows.map((_, i) => i)))
    } else {
      // include all
      setExcluded(new Set())
    }
  }

  async function handleImport() {
    if (!accountId) return alert('Select an account first')
    setLoading(true)

    const sessionId = run(
      `INSERT INTO import_sessions (account_id,filename,file_type,format_profile,rows_imported,rows_skipped)
       VALUES (?,?,?,?,?,?)`,
      [accountId, 'import', 'unknown', profile, 0, 0]
    )

    let imported = 0, skipped = 0, manuallyExcluded = excluded.size

    for (let i = 0; i < rows.length; i++) {
      if (excluded.has(i)) continue
      const row = rows[i]
      const dups = findFuzzyDuplicates(Number(accountId), row.date, row.amount, row.description)
      if (dups.length > 0) { skipped++; continue }
      const txId = createTransaction({ ...row, account_id: Number(accountId), import_session_id: sessionId })
      if (row.tag_ids?.length) setTransactionTags(txId, row.tag_ids)
      imported++
    }

    run(`UPDATE import_sessions SET rows_imported=?, rows_skipped=? WHERE id=?`,
      [imported, skipped + manuallyExcluded, sessionId])

    setResult({ imported, skipped, excluded: manuallyExcluded })
    setStep('done')
    setLoading(false)
  }

  function handleMapped(mappedRows) {
    const enriched = mappedRows.map(r => {
      const match = applyRules(r.description ?? '', rules)
      return { ...r, category_id: match?.category_id ?? null, budget_item_id: match?.budget_item_id ?? null, tag_ids: match?.tag_ids ?? [] }
    })
    setRows(enriched)
    setExcluded(new Set())
    setDupIndices(new Set())
    setProfile('pdf_mapped')
    setStep('preview')
  }

  function handleColumnsMapped(mapping) {
    if (accountId) saveAccountImportProfile(Number(accountId), mapping)
    const mapped = applyColumnProfile(rawImport.rawRows, mapping)
    const enriched = mapped.map(r => {
      const match = applyRules(r.description ?? '', rules)
      return { ...r, category_id: match?.category_id ?? null, budget_item_id: match?.budget_item_id ?? null, tag_ids: match?.tag_ids ?? [] }
    })
    setRows(enriched)
    setExcluded(new Set())
    setDupIndices(new Set())
    setProfile('Generic')
    setStep('preview')
  }

  function reset() {
    setStep('upload')
    setRows([])
    setProfile('')
    setResult(null)
    setError(null)
    setPdfData(null)
    setRawImport(null)
    setExcluded(new Set())
    setDupIndices(new Set())
  }

  const includedCount = rows.length - excluded.size

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Import Transactions</h1>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="card">
            <label className="label">Import into Account</label>
            <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
              ${loading
                ? 'border-brand-700 bg-brand-900/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer'}`}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" id="file-input" onChange={onDrop} />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload size={36} className="mx-auto mb-3 text-slate-400 dark:text-slate-600" />
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {loading ? 'Parsing…' : 'Drop a file here or click to browse'}
              </p>
              <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">CSV, Excel (.xlsx/.xls), or PDF bank statement</p>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Step: Map PDF columns */}
      {step === 'map' && pdfData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900 dark:text-slate-100">Map PDF Columns</h2>
              <p className="text-slate-500 text-sm mt-0.5">{pdfData.grid.length} rows extracted · {pdfData.numCols} columns detected</p>
            </div>
            <button className="btn-ghost" onClick={reset}><X size={14} /> Cancel</button>
          </div>
          <PdfMapper grid={pdfData.grid} numCols={pdfData.numCols} onMapped={handleMapped} />
        </div>
      )}

      {/* Step: Map CSV columns */}
      {step === 'col-map' && rawImport && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900 dark:text-slate-100">Map Columns</h2>
              <p className="text-slate-500 text-sm mt-0.5">{rawImport.rawRows.length} rows · {rawImport.headers.length} columns detected</p>
            </div>
            <button className="btn-ghost" onClick={reset}><X size={14} /> Cancel</button>
          </div>
          <ColumnMapper
            headers={rawImport.headers}
            rawRows={rawImport.rawRows}
            savedProfile={rawImport.savedProfile}
            onConfirm={handleColumnsMapped}
          />
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-200">{rows.length}</span> transactions parsed
              {profile && <span className="text-slate-400 dark:text-slate-600"> · {profile}</span>}
              {excluded.size > 0 && (
                <span className="text-slate-400 dark:text-slate-600"> · {excluded.size} excluded</span>
              )}
            </p>
            <div className="flex gap-2">
              {rawImport && (
                <button className="btn-ghost" onClick={() => setStep('col-map')}>Remap columns</button>
              )}
              <button className="btn-ghost" onClick={reset}><X size={14} /> Cancel</button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={loading || !accountId || includedCount === 0}
              >
                {loading ? 'Importing…' : `Import ${includedCount} row${includedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {!accountId && (
            <div className="card">
              <label className="label">Import into Account</label>
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Select account…</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                  <th className="px-4 py-3 w-8">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                      checked={includedCount === rows.length && rows.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Description</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">Category</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const cat = categories.find(c => c.id === row.category_id)
                  const isExcluded = excluded.has(i)
                  const isDup = dupIndices.has(i)
                  return (
                    <tr
                      key={i}
                      className={`border-b border-slate-200/50 dark:border-slate-800/50 transition-colors
                        ${isExcluded
                          ? 'opacity-40'
                          : 'hover:bg-slate-100/20 dark:hover:bg-slate-800/20'}`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                          checked={!isExcluded}
                          onChange={() => toggleExcluded(i)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtDate(row.date)}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`truncate text-slate-800 dark:text-slate-200 ${isExcluded ? 'line-through' : ''}`}>
                            {row.description}
                          </span>
                          {isDup && (
                            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              duplicate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <select
                            className="bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded px-2 py-1
                                       focus:outline-none focus:border-brand-500"
                            value={row.category_id ?? ''}
                            onChange={e => updateRowCategory(i, e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Uncategorized</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                          <button
                            title="Save as rule"
                            className="btn-ghost p-2 text-slate-400 dark:text-slate-600 hover:text-brand-400 flex-shrink-0"
                            onClick={() => setSavingRuleFor({ idx: i, pattern: row.description, categoryId: row.category_id })}
                          >
                            <BookmarkPlus size={13} />
                          </button>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono ${row.amount >= 0 ? 'text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {row.amount >= 0 ? '+' : ''}{fmt(row.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="card text-center py-16 space-y-4">
          <CheckCircle size={48} className="mx-auto text-brand-400" />
          <div>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{result.imported} transactions imported</p>
            <div className="text-slate-500 text-sm mt-1 space-y-0.5">
              {result.skipped > 0 && <p>{result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped</p>}
              {result.excluded > 0 && <p>{result.excluded} manually excluded</p>}
            </div>
          </div>
          <button className="btn-primary" onClick={reset}>Import More</button>
        </div>
      )}

      {savingRuleFor !== null && (
        <RuleModal
          categories={categories}
          tags={tags}
          initialPattern={savingRuleFor.pattern}
          initialCategoryId={savingRuleFor.categoryId}
          onSave={handleRuleSaved}
          onClose={() => setSavingRuleFor(null)}
        />
      )}
    </div>
  )
}
