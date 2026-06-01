PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── Accounts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  institution   TEXT,
  type          TEXT    NOT NULL DEFAULT 'checking',  -- checking | savings | credit | investment | loan
  currency      TEXT    NOT NULL DEFAULT 'USD',
  color         TEXT    NOT NULL DEFAULT '#22c55e',
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Category Groups ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color      TEXT    NOT NULL DEFAULT '#64748b'
);

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL UNIQUE,
  icon          TEXT    NOT NULL DEFAULT '📦',
  color         TEXT    NOT NULL DEFAULT '#64748b',
  parent_id     INTEGER REFERENCES categories(id),
  is_income     INTEGER NOT NULL DEFAULT 0,
  group_id      INTEGER REFERENCES category_groups(id)
);

-- ── Category Rules (the "learning" layer) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_rules (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern       TEXT    NOT NULL,           -- substring match against description
  pattern_type  TEXT    NOT NULL DEFAULT 'contains',  -- contains | starts_with | regex
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  priority      INTEGER NOT NULL DEFAULT 0, -- higher wins on conflict
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  date          TEXT    NOT NULL,           -- ISO 8601: YYYY-MM-DD
  amount        REAL    NOT NULL,           -- negative = expense, positive = income
  description   TEXT    NOT NULL,
  payee         TEXT,                       -- normalized payee name
  category_id   INTEGER REFERENCES categories(id),
  notes         TEXT,
  import_session_id INTEGER REFERENCES import_sessions(id),
  is_transfer   INTEGER NOT NULL DEFAULT 0,
  cleared       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account     ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category    ON transactions(category_id);

-- ── Tags ──────────────────────────────────────────────────────────────────────
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

-- ── Transaction Splits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_splits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id    INTEGER REFERENCES categories(id),
  budget_item_id INTEGER REFERENCES budgets(id),
  amount         REAL    NOT NULL,
  note           TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tx_splits_tx ON transaction_splits(transaction_id);

CREATE TABLE IF NOT EXISTS rule_tags (
  rule_id INTEGER NOT NULL REFERENCES category_rules(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)           ON DELETE CASCADE,
  PRIMARY KEY (rule_id, tag_id)
);

-- ── Budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  category_id   INTEGER REFERENCES categories(id),
  amount        REAL    NOT NULL,
  period        TEXT    NOT NULL DEFAULT 'monthly',
                        -- weekly | monthly | quarterly | semi_annual | annual
  start_date    TEXT    NOT NULL DEFAULT (date('now', 'start of month')),
  end_date      TEXT,   -- NULL = ongoing
  notes         TEXT,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Import Sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id    INTEGER REFERENCES accounts(id),
  filename      TEXT    NOT NULL,
  file_type     TEXT    NOT NULL,           -- csv | excel | pdf
  format_profile TEXT,                     -- detected institution format (e.g. 'chase_csv')
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_skipped  INTEGER NOT NULL DEFAULT 0,
  imported_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Account Import Profiles (saved CSV column mappings) ─────────────────────
CREATE TABLE IF NOT EXISTS account_import_profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  col_date    TEXT    NOT NULL,
  col_desc    TEXT    NOT NULL,
  col_amount  TEXT,
  col_debit   TEXT,
  col_credit  TEXT,
  col_payee   TEXT,
  negate      INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id)
);

-- ── App Settings (key/value store) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT    PRIMARY KEY,
  value         TEXT    NOT NULL
);

