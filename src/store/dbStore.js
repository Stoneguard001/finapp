import { create } from 'zustand'
import { initDatabase, exportDatabase, closeDatabase, setOnWrite } from '@/db/database'

const LS_KEY = 'finapp_autosave'

let _saveTimer = null
function scheduleAutoSave(saveFn) {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(saveFn, 600)
}

export const useDbStore = create((set, get) => {
  // Register the write hook once at store creation
  setOnWrite(() => {
    const { autoSave, fileHandle } = get()
    if (autoSave && fileHandle) {
      scheduleAutoSave(() => get()._writeToDisk())
    }
  })

  return {
    ready:    false,
    dbName:   null,
    fileHandle: null,
    autoSave: localStorage.getItem(LS_KEY) === 'true',

    async openNew(seeded = true) {
      closeDatabase()
      await initDatabase(null, { seeded })

      if ('showSaveFilePicker' in window) {
        const date = new Date().toISOString().slice(0, 10)
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: `finapp-${date}.sqlite`,
            types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }]
          })
          const data = exportDatabase()
          const writable = await handle.createWritable()
          await writable.write(data)
          await writable.close()
          set({ ready: true, dbName: handle.name, fileHandle: handle })
        } catch (e) {
          if (e.name === 'AbortError') {
            closeDatabase()
            return  // user cancelled — stay on welcome screen
          }
          set({ ready: true, dbName: 'New Database', fileHandle: null })
        }
      } else {
        set({ ready: true, dbName: 'New Database', fileHandle: null })
      }
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

    // Internal: write current DB to the stored file handle
    async _writeToDisk() {
      const { fileHandle } = get()
      if (!fileHandle) return
      const data = exportDatabase()
      const writable = await fileHandle.createWritable()
      await writable.write(data)
      await writable.close()
    },

    async save() {
      const { fileHandle } = get()
      if (fileHandle) {
        await get()._writeToDisk()
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

    async toggleAutoSave() {
      const { autoSave, fileHandle } = get()
      if (!autoSave && !fileHandle) {
        // Need a file handle before auto-save can work — prompt Save As
        await get().saveAs()
        if (!get().fileHandle) return  // user cancelled
      }
      const next = !autoSave
      localStorage.setItem(LS_KEY, next)
      set({ autoSave: next })
    },

    close() {
      closeDatabase()
      set({ ready: false, dbName: null, fileHandle: null })
    }
  }
})
