import { query, run } from '../database'

export function getSetting(key, fallback = null) {
  try {
    const row = query('SELECT value FROM settings WHERE key=?', [key])[0]
    return row ? row.value : fallback
  } catch {
    return fallback
  }
}

export function setSetting(key, value) {
  run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value])
}
