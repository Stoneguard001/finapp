import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSQL from './schema.sql?raw'
import schemaSeedSQL from './schema-seed.sql?raw'
import { migrations } from './migrations'

let _db = null
let _SQL = null
let _onWrite = null

export const setOnWrite = (fn) => { _onWrite = fn }

function runMigrations(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT    NOT NULL,
      applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const result = db.exec('SELECT version FROM schema_migrations')
  const applied = new Set(result[0]?.values.map(r => r[0]) ?? [])

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue

    try {
      if (migration.up !== null) {
        if (typeof migration.up === 'function') {
          migration.up(db)
        } else if (Array.isArray(migration.up)) {
          for (const sql of migration.up) db.run(sql)
        } else {
          db.run(migration.up)
        }
      }
    } catch (e) {
      // Tolerate "already exists" / "duplicate column" so that databases which
      // received ad-hoc schema changes before this system existed can still be
      // brought under version control without manual intervention.
      const msg = String(e?.message ?? '')
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }

    db.run('INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)',
      [migration.version, migration.description])
  }
}

export async function createFreshDatabase() {
  if (!_SQL) {
    _SQL = await initSqlJs({ locateFile: () => sqlWasm })
  }
  return new _SQL.Database()
}

export async function initDatabase(fileBuffer = null, { seeded = true } = {}) {
  if (!_SQL) {
    _SQL = await initSqlJs({ locateFile: () => sqlWasm })
  }

  if (fileBuffer) {
    _db = new _SQL.Database(new Uint8Array(fileBuffer))
  } else {
    _db = new _SQL.Database()
    _db.run(schemaSQL)
    if (seeded) _db.run(schemaSeedSQL)
  }

  runMigrations(_db)
  return _db
}

export function getDb() {
  if (!_db) throw new Error('Database not initialized — call initDatabase() first')
  return _db
}

export function exportDatabase() {
  return getDb().export()
}

export function closeDatabase() {
  if (_db) {
    _db.close()
    _db = null
  }
}

// Returns all migrations with their applied status — useful for a settings/debug screen.
export function getMigrationStatus() {
  const result = getDb().exec(
    'SELECT version, description, applied_at FROM schema_migrations ORDER BY version'
  )
  const applied = new Map(
    (result[0]?.values ?? []).map(([version, description, applied_at]) =>
      [version, { version, description, applied_at }]
    )
  )
  return migrations.map(m => ({
    version:     m.version,
    description: m.description,
    applied_at:  applied.get(m.version)?.applied_at ?? null
  }))
}

// Helper: run a SELECT and return rows as plain objects
export function query(sql, params = []) {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// Helper: run INSERT / UPDATE / DELETE
export function run(sql, params = []) {
  getDb().run(sql, params)
  const id = getDb().exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? null
  _onWrite?.()
  return id
}

export function runMany(sql, paramSets) {
  const stmt = getDb().prepare(sql)
  for (const params of paramSets) {
    stmt.run(params)
  }
  stmt.free()
}
