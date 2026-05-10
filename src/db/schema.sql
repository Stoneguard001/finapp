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

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL UNIQUE,
  icon          TEXT    NOT NULL DEFAULT '📦',
  color         TEXT    NOT NULL DEFAULT '#64748b',
  parent_id     INTEGER REFERENCES categories(id),
  is_income     INTEGER NOT NULL DEFAULT 0
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

-- ── App Settings (key/value store) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT    PRIMARY KEY,
  value         TEXT    NOT NULL
);

-- ── Seed default categories ───────────────────────────────────────────────────
INSERT OR IGNORE INTO categories (name, icon, color) VALUES
  ('Housing',        '🏠', '#ef4444'),
  ('Groceries',      '🛒', '#f97316'),
  ('Dining Out',     '🍽️',  '#f59e0b'),
  ('Transportation', '🚗', '#eab308'),
  ('Utilities',      '💡', '#84cc16'),
  ('Internet/Phone', '📱', '#22c55e'),
  ('Insurance',      '🛡️',  '#14b8a6'),
  ('Healthcare',     '🏥', '#06b6d4'),
  ('Subscriptions',  '📺', '#3b82f6'),
  ('Shopping',       '🛍️',  '#8b5cf6'),
  ('Entertainment',  '🎬', '#a855f7'),
  ('Travel',         '✈️',  '#ec4899'),
  ('Education',      '📚', '#f43f5e'),
  ('Personal Care',  '💅', '#fb7185'),
  ('Pets',           '🐾', '#fbbf24'),
  ('Savings',        '💰', '#4ade80'),
  ('Investments',    '📈', '#34d399'),
  ('Gifts/Charity',  '🎁', '#a3e635'),
  ('Income',         '💵', '#22c55e'),
  ('Transfer',       '🔄', '#94a3b8'),
  ('Uncategorized',  '❓', '#475569');

-- ── Seed default category rules ───────────────────────────────────────────────
INSERT OR IGNORE INTO category_rules (pattern, category_id, priority) VALUES
  ('AMAZON',       (SELECT id FROM categories WHERE name='Shopping'),       10),
  ('NETFLIX',      (SELECT id FROM categories WHERE name='Subscriptions'),  10),
  ('SPOTIFY',      (SELECT id FROM categories WHERE name='Subscriptions'),  10),
  ('HULU',         (SELECT id FROM categories WHERE name='Subscriptions'),  10),
  ('APPLE.COM',    (SELECT id FROM categories WHERE name='Subscriptions'),  10),
  ('GOOGLE',       (SELECT id FROM categories WHERE name='Subscriptions'),  10),
  ('UBER EATS',    (SELECT id FROM categories WHERE name='Dining Out'),     10),
  ('DOORDASH',     (SELECT id FROM categories WHERE name='Dining Out'),     10),
  ('GRUBHUB',      (SELECT id FROM categories WHERE name='Dining Out'),     10),
  ('UBER',         (SELECT id FROM categories WHERE name='Transportation'), 5),
  ('LYFT',         (SELECT id FROM categories WHERE name='Transportation'), 10),
  ('GAS',          (SELECT id FROM categories WHERE name='Transportation'), 5),
  ('SHELL',        (SELECT id FROM categories WHERE name='Transportation'), 10),
  ('CHEVRON',      (SELECT id FROM categories WHERE name='Transportation'), 10),
  ('EXXON',        (SELECT id FROM categories WHERE name='Transportation'), 10),
  ('WALMART',      (SELECT id FROM categories WHERE name='Groceries'),      10),
  ('KROGER',       (SELECT id FROM categories WHERE name='Groceries'),      10),
  ('WHOLE FOODS',  (SELECT id FROM categories WHERE name='Groceries'),      10),
  ('TRADER JOE',   (SELECT id FROM categories WHERE name='Groceries'),      10),
  ('CVS',          (SELECT id FROM categories WHERE name='Healthcare'),     5),
  ('WALGREENS',    (SELECT id FROM categories WHERE name='Healthcare'),     5),
  ('PAYROLL',      (SELECT id FROM categories WHERE name='Income'),         10),
  ('DIRECT DEP',   (SELECT id FROM categories WHERE name='Income'),         10),
  ('TRANSFER',     (SELECT id FROM categories WHERE name='Transfer'),       5);
