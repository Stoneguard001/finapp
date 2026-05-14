import { useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Pencil, GripVertical } from 'lucide-react'
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  getCategories, getGroups, getRules,
  createRule, deleteRule, deleteCategory,
  createGroup, updateGroup, deleteGroup, cascadeGroupColor,
  updateCategory,
} from '@/db/queries/categories'
import { useQuery } from '@/hooks/useQuery'
import CategoryModal from '@/components/CategoryModal'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
  '#64748b', '#94a3b8',
]
const COLOR_NAMES = {
  '#ef4444': 'Red',   '#f97316': 'Orange', '#f59e0b': 'Amber',  '#eab308': 'Yellow',
  '#84cc16': 'Lime',  '#22c55e': 'Green',  '#14b8a6': 'Teal',   '#06b6d4': 'Cyan',
  '#3b82f6': 'Blue',  '#8b5cf6': 'Violet', '#a855f7': 'Purple', '#ec4899': 'Pink',
  '#64748b': 'Slate', '#94a3b8': 'Light Slate',
}

function DraggableCategoryCard({ c, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        title="Drag to move to another group"
        className="cursor-grab active:cursor-grabbing shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 touch-none"
      >
        <GripVertical size={13} />
      </button>
      <span>{c.icon}</span>
      <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{c.name}</span>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
      <button
        title="Edit category"
        className="btn-ghost p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
        onClick={onEdit}
      >
        <Pencil size={11} />
      </button>
      <button
        title="Delete category"
        className="btn-ghost p-0.5 text-slate-400 dark:text-slate-500 hover:text-red-500"
        onClick={onDelete}
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function DroppableGrid({ groupId, cats, onEdit, onDelete }) {
  const droppableId = groupId != null ? String(groupId) : '__ungrouped__'
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      className={`grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[44px] rounded-lg p-1 -m-1 transition-colors ${isOver ? 'bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-400/50 ring-inset' : ''}`}
    >
      {cats.map(c => (
        <DraggableCategoryCard key={c.id} c={c} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
      ))}
      {cats.length === 0 && (
        <p className="col-span-3 text-xs text-slate-400 dark:text-slate-600 py-1 pl-1">
          {isOver ? 'Drop here to add to this group' : 'No categories in this group yet.'}
        </p>
      )}
    </div>
  )
}

function CardOverlay({ c }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl opacity-95 cursor-grabbing">
      <GripVertical size={13} className="text-slate-400 shrink-0" />
      <span>{c.icon}</span>
      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
    </div>
  )
}

export default function Categories() {
  const [refresh, setRefresh]                     = useState(0)
  const [newPattern, setPattern]                  = useState('')
  const [newCatId, setCatId]                      = useState('')
  const [editing, setEditing]                     = useState(null)
  const [editingGroupId, setEditingGroupId]       = useState(null)
  const [editingGroupName, setEditingGroupName]   = useState('')
  const [editingGroupColor, setEditingGroupColor] = useState('')
  const [newGroupName, setNewGroupName]           = useState('')
  const [newGroupColor, setNewGroupColor]         = useState('#64748b')
  const [showAddGroup, setShowAddGroup]           = useState(false)
  const [activeCat, setActiveCat]                 = useState(null)
  const bump = useCallback(() => setRefresh(r => r + 1), [])

  const { data: categories = [] } = useQuery(() => getCategories(), [refresh])
  const { data: groups = [] }     = useQuery(() => getGroups(), [refresh])
  const { data: rules = [] }      = useQuery(() => getRules(), [refresh])

  function addRule(e) {
    e.preventDefault()
    if (!newPattern || !newCatId) return
    createRule({ pattern: newPattern, category_id: Number(newCatId) })
    setPattern('')
    setCatId('')
    bump()
  }

  function removeRule(id) {
    deleteRule(id)
    bump()
  }

  function handleDeleteCategory(c) {
    if (!confirm(`Delete "${c.name}"? Associated transactions will be uncategorized and any budget items for this category will also be removed.`)) return
    deleteCategory(c.id)
    bump()
  }

  function handleAddGroup(e) {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    createGroup(name, newGroupColor)
    setNewGroupName('')
    setNewGroupColor('#64748b')
    setShowAddGroup(false)
    bump()
  }

  function saveGroup() {
    const name = editingGroupName.trim()
    if (name && editingGroupId) {
      const originalColor = groups.find(g => g.id === editingGroupId)?.color ?? '#64748b'
      updateGroup(editingGroupId, { name, color: editingGroupColor })
      if (editingGroupColor !== originalColor)
        cascadeGroupColor(editingGroupId, originalColor, editingGroupColor)
      bump()
    }
    setEditingGroupId(null)
  }

  function handleDeleteGroup(g) {
    if (!confirm(`Delete group "${g.name}"? Categories in this group will become ungrouped.`)) return
    deleteGroup(g.id)
    bump()
  }

  function handleDragStart({ active }) {
    setActiveCat(categories.find(c => c.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }) {
    setActiveCat(null)
    if (!over) return
    const targetGroupId = over.id === '__ungrouped__' ? null : Number(over.id)
    const cat = categories.find(c => c.id === active.id)
    if (!cat || cat.group_id === targetGroupId) return
    const targetGroup = groups.find(g => g.id === targetGroupId)
    const updates = { group_id: targetGroupId }
    if (targetGroup?.color) updates.color = targetGroup.color
    updateCategory(active.id, updates)
    bump()
  }

  const hasNamedGroups = groups.length > 0

  const groupedCategories = useMemo(() => {
    const map = {}
    for (const g of groups) map[g.id] = { group: g, cats: [] }
    const ungrouped = { group: null, cats: [] }
    for (const c of categories) {
      if (c.group_id && map[c.group_id]) map[c.group_id].cats.push(c)
      else ungrouped.cats.push(c)
    }
    const named = groups.map(g => map[g.id]).filter(Boolean)
    return ungrouped.cats.length > 0 ? [...named, ungrouped] : named
  }, [groups, categories])

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Categories &amp; Rules</h1>

      {/* Categories */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Categories</h2>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => setShowAddGroup(true)}>
              <Plus size={13} /> Group
            </button>
            <button className="btn-primary text-xs py-1 px-3 flex items-center gap-1" onClick={() => setEditing({})}>
              <Plus size={13} /> Category
            </button>
          </div>
        </div>

        {showAddGroup && (
          <form onSubmit={handleAddGroup} className="space-y-2 pb-1">
            <div className="flex flex-wrap gap-1.5 items-center">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" title={COLOR_NAMES[c]}
                  onClick={() => setNewGroupColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${newGroupColor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)}
                title="Custom color"
                className="w-5 h-5 rounded-full cursor-pointer border-2 border-transparent bg-transparent p-0" />
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Group name…"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Escape') { setShowAddGroup(false); setNewGroupName('') } }}
              />
              <button type="submit" className="btn-primary text-xs px-3" disabled={!newGroupName.trim()}>Add</button>
              <button type="button" className="btn-ghost text-xs" onClick={() => { setShowAddGroup(false); setNewGroupName('') }}>Cancel</button>
            </div>
          </form>
        )}

        <DndContext collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="space-y-5">
            {groupedCategories.map(({ group, cats }) => (
              <div key={group?.id ?? 'ungrouped'}>
                {/* Group header */}
                {(group !== null || hasNamedGroups) && (
                  <div className="flex items-center gap-2 mb-2">
                    {editingGroupId === group?.id ? (
                      <div className="space-y-2 py-1 flex-1">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {PRESET_COLORS.map(c => (
                            <button key={c} type="button" title={COLOR_NAMES[c]}
                              onClick={() => setEditingGroupColor(c)}
                              className={`w-5 h-5 rounded-full border-2 transition-colors ${editingGroupColor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                              style={{ background: c }}
                            />
                          ))}
                          <input type="color" value={editingGroupColor} onChange={e => setEditingGroupColor(e.target.value)}
                            title="Custom color"
                            className="w-5 h-5 rounded-full cursor-pointer border-2 border-transparent bg-transparent p-0" />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="input text-xs py-0.5 px-2 h-auto max-w-[200px]"
                            value={editingGroupName}
                            onChange={e => setEditingGroupName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveGroup(); if (e.key === 'Escape') setEditingGroupId(null) }}
                            autoFocus
                          />
                          <button onClick={saveGroup} className="btn-primary text-xs px-2 py-0.5">Save</button>
                          <button onClick={() => setEditingGroupId(null)} className="btn-ghost text-xs px-2 py-0.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {group && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.color ?? '#64748b' }} />}
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {group?.name ?? 'Ungrouped'}
                        </span>
                      </>
                    )}
                    {group && editingGroupId !== group.id && (
                      <>
                        <button
                          title="Edit group"
                          className="btn-ghost p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); setEditingGroupColor(group.color ?? '#64748b') }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          title="Delete group"
                          className="btn-ghost p-0.5 text-slate-400 dark:text-slate-500 hover:text-red-500"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <DroppableGrid
                  groupId={group?.id ?? null}
                  cats={cats}
                  onEdit={setEditing}
                  onDelete={handleDeleteCategory}
                />
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-center text-slate-400 dark:text-slate-600 py-4">No categories yet.</p>
            )}
          </div>

          <DragOverlay>
            {activeCat && <CardOverlay c={activeCat} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Auto-Categorization Rules */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Auto-Categorization Rules</h2>
        <p className="text-xs text-slate-400 dark:text-slate-600">
          When a transaction description contains the keyword, it's automatically assigned that category.
        </p>

        <form onSubmit={addRule} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Keyword (e.g. NETFLIX)"
            value={newPattern}
            onChange={e => setPattern(e.target.value.toUpperCase())}
          />
          <select className="input w-44" value={newCatId} onChange={e => setCatId(e.target.value)}>
            <option value="">Category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button type="submit" className="btn-primary flex-shrink-0"><Plus size={14} /> Add</button>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
              <th className="py-2 text-xs font-medium text-slate-400 dark:text-slate-500">Keyword</th>
              <th className="py-2 text-xs font-medium text-slate-400 dark:text-slate-500">Category</th>
              <th className="py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-slate-200/40 dark:border-slate-800/40">
                <td className="py-2 font-mono text-slate-700 dark:text-slate-300 text-xs">{r.pattern}</td>
                <td className="py-2 text-slate-500 dark:text-slate-400 text-xs">{r.category_name}</td>
                <td className="py-2">
                  <button onClick={() => removeRule(r.id)}
                    title="Delete rule"
                    className="btn-ghost p-1 text-slate-400 dark:text-slate-500 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-slate-400 dark:text-slate-600">No rules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <CategoryModal
          category={editing}
          groups={groups}
          onSave={() => { setEditing(null); bump() }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
