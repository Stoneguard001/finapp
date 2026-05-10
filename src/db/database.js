import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSQL from './schema.sql?raw'

let _db = null
let _SQL = null

export async function initDatabase(fileBuffer = null) {
  if (!_SQL) {
    _SQL = await initSqlJs({ locateFile: () => sqlWasm })
  }

  if (fileBuffer) {
    _db = new _SQL.Database(new Uint8Array(fileBuffer))
  } else {
    _db = new _SQL.Database()
    _db.run(schemaSQL)
  }

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
  return getDb().exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? null
}

export function runMany(sql, paramSets) {
  const stmt = getDb().prepare(sql)
  for (const params of paramSets) {
    stmt.run(params)
  }
  stmt.free()
}
