import { useState, useMemo } from 'react'
import Modal from '@/components/Modal'
import { createRule, setRuleTags } from '@/db/queries/categories'
import TagPicker from '@/components/TagPicker'

export default function RuleModal({ categories, tags = [], budgets = [], initialPattern = '', initialCategoryId = null, onSave, onClose }) {
  const [pattern, setPattern]         = useState(initialPattern.trim().toUpperCase())
  const [patternType, setPatternType] = useState('contains')
  const [categoryId, setCategoryId]   = useState(initialCategoryId ?? '')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [priority, setPriority]       = useState(0)
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const categoryBudgets = useMemo(() =>
    budgets.filter(b => b.category_id === Number(categoryId)),
    [budgets, categoryId]
  )

  function handleCategoryChange(val) {
    setCategoryId(val)
    setBudgetItemId('')
  }

  function handleSave() {
    if (!pattern.trim() || !categoryId) return
    const rule = {
      pattern:        pattern.trim(),
      pattern_type:   patternType,
      category_id:    Number(categoryId),
      budget_item_id: budgetItemId ? Number(budgetItemId) : null,
      priority:       Number(priority)
    }
    const ruleId = createRule(rule)
    if (selectedTagIds.length) setRuleTags(ruleId, selectedTagIds)
    onSave({ ...rule, id: ruleId, tag_ids: selectedTagIds })
  }

  return (
    <Modal title="Save Category Rule" onClose={onClose}>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Transactions whose description matches this pattern will be auto-categorized on import.
      </p>
      <div>
        <label className="label">Pattern</label>
        <input
          className="input font-mono uppercase"
          value={pattern}
          onChange={e => setPattern(e.target.value.toUpperCase())}
          placeholder="HONDA"
        />
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Trim to just the keyword — e.g. "HONDA" not the full description</p>
      </div>
      <div>
        <label className="label">
          Match type
          {patternType === 'regex' && (
            <a href="https://regex101.com" target="_blank" rel="noreferrer"
              className="ml-2 text-xs font-normal text-brand-600 dark:text-brand-400 underline hover:text-brand-800 dark:hover:text-brand-200">
              regex reference
            </a>
          )}
        </label>
        <select className="input" value={patternType} onChange={e => setPatternType(e.target.value)}>
          <option value="contains">Contains</option>
          <option value="starts_with">Starts with</option>
          <option value="regex">Regex</option>
        </select>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
          <option value="">Select category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      {categoryBudgets.length > 0 && (
        <div>
          <label className="label">Budget item <span className="text-slate-400 dark:text-slate-600 font-normal">(optional)</span></label>
          <select className="input" value={budgetItemId} onChange={e => setBudgetItemId(e.target.value)}>
            <option value="">None</option>
            {categoryBudgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">Tags <span className="text-slate-400 dark:text-slate-600 font-normal">(applied automatically with this rule)</span></label>
        <TagPicker tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
      </div>
      <div>
        <label className="label">
          Priority <span className="text-slate-400 dark:text-slate-600 font-normal">(higher wins when multiple rules match)</span>
        </label>
        <input type="number" className="input" value={priority} min={0}
          onChange={e => setPriority(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}
          disabled={!pattern.trim() || !categoryId}>
          Save Rule
        </button>
      </div>
    </Modal>
  )
}
