import { create } from 'zustand'
import { initDatabase, exportDatabase, closeDatabase } from '@/db/database'

export const useDbStore = create((set, get) => ({
  ready: false,
  dbName: null,
  fileHandle: null,   // File System Access API handle for auto-save

  async openNew() {
    closeDatabase()
    await initDatabase()
    set({ ready: true, dbName: 'New Database', fileHandle: null })
  },

  async openFile(file) {
    const buffer = await file.arrayBuffer()
    closeDatabase()
    await initDatabase(buffer)
    set({ ready: true, dbName: file.name, fileHandle: null })
  },

  async openFileHandle(handle) {
    const file = await handle.getFile()
    const buffer = await file.arrayBuffer()
    closeDatabase()
    await initDatabase(buffer)
    set({ ready: true, dbName: file.name, fileHandle: handle })
  },

  async save() {
    const { fileHandle } = get()
    const data = exportDatabase()
    if (fileHandle) {
      const writable = await fileHandle.createWritable()
      await writable.write(data)
      await writable.close()
    } else {
      await get().saveAs()
    }
  },

  async saveAs() {
    const data = exportDatabase()
    const date = new Date().toISOString().slice(0, 10)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `finapp-${date}.sqlite`,
          types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(data)
        await writable.close()
        set({ fileHandle: handle })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    // Fallback: download via <a> tag
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finapp-${date}.sqlite`
    a.click()
    URL.revokeObjectURL(url)
  },

  close() {
    closeDatabase()
    set({ ready: false, dbName: null, fileHandle: null })
  }
}))
