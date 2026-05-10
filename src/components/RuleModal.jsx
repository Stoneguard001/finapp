import { useState } from 'react'
import Modal from '@/components/Modal'
import { createRule, setRuleTags } from '@/db/queries/categories'
import TagPicker from '@/components/TagPicker'

export default function RuleModal({ categories, tags = [], initialPattern = '', initialCategoryId = null, onSave, onClose }) {
  const [pattern, setPattern]         = useState(initialPattern.trim().toUpperCase())
  const [patternType, setPatternType] = useState('contains')
  const [categoryId, setCategoryId]   = useState(initialCategoryId ?? '')
  const [priority, setPriority]       = useState(0)
  const [selectedTagIds, setSelectedTagIds] = useState([])

  function handleSave() {
    if (!pattern.trim() || !categoryId) return
    const rule = {
      pattern:      pattern.trim(),
      pattern_type: patternType,
      category_id:  Number(categoryId),
      priority:     Number(priority)
    }
    const ruleId = createRule(rule)
    if (selectedTagIds.length) setRuleTags(ruleId, selectedTagIds)
    onSave({ ...rule, tag_ids: selectedTagIds })
  }

  return (
    <Modal title="Save Category Rule" onClose={onClose}>
      <p className="text-sm text-slate-400">
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
        <p className="text-xs text-slate-600 mt-1">Trim to just the keyword — e.g. "HONDA" not the full description</p>
      </div>
      <div>
        <label className="label">Match type</label>
        <select className="input" value={patternType} onChange={e => setPatternType(e.target.value)}>
          <option value="contains">Contains</option>
          <option value="starts_with">Starts with</option>
          <option value="regex">Regex</option>
        </select>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">Select category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tags <span className="text-slate-600 font-normal">(applied automatically with this rule)</span></label>
        <TagPicker tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
      </div>
      <div>
        <label className="label">
          Priority <span className="text-slate-600 font-normal">(higher wins when multiple rules match)</span>
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
