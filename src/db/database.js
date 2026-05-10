import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSQL from './schema.sql?raw'

let _db = null
let _SQL = null
let _onWrite = null

export const setOnWrite = (fn) => { _onWrite = fn }

// Additive migrations — safe to run against any existing database.
// Add new statements here whenever the schema gains new tables or columns.
const migrations = `
  CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    color TEXT    NOT NULL DEFAULT '#64748b'
  );
  CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id         INTEGER NOT NULL REFERENCES tags(id)         ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
  );
  CREATE TABLE IF NOT EXISTS rule_tags (
    rule_id INTEGER NOT NULL REFERENCES category_rules(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id)           ON DELETE CASCADE,
    PRIMARY KEY (rule_id, tag_id)
  );
`

export async function initDatabase(fileBuffer = null) {
  if (!_SQL) {
    _SQL = await initSqlJs({ locateFile: () => sqlWasm })
  }

  if (fileBuffer) {
    _db = new _SQL.Database(new Uint8Array(fileBuffer))
    _db.run(migrations)
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
