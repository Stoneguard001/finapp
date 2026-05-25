// Each migration runs exactly once per database, in version order.
// `up` can be a SQL string, an array of SQL strings, or a function (db) => void.
// Use a function for data migrations or logic that can't be expressed in plain SQL.
// To add a migration: append a new entry and increment the version number.
export const migrations = [
  {
    version: 1,
    description: 'Initial schema (accounts, categories, transactions, budgets, settings)',
    up: null  // schema.sql handles fresh databases; existing DBs already have this
  },
  {
    version: 2,
    description: 'Add tags, transaction_tags, rule_tags',
    // IF NOT EXISTS makes this safe for DBs created after tags were added to schema.sql
    up: `
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
  },
  {
    version: 3,
    description: 'Add budget_item_id to transactions',
    up: 'ALTER TABLE transactions ADD COLUMN budget_item_id INTEGER REFERENCES budgets(id)'
  },
  {
    version: 4,
    description: 'Add category_groups table and group_id to categories',
    up: `
      CREATE TABLE IF NOT EXISTS category_groups (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      ALTER TABLE categories ADD COLUMN group_id INTEGER REFERENCES category_groups(id);
    `
  },
  {
    version: 5,
    description: 'Add color to category_groups',
    up: `ALTER TABLE category_groups ADD COLUMN color TEXT NOT NULL DEFAULT '#64748b'`
  },
  {
    version: 6,
    description: 'Add budget_item_id to category_rules',
    up: 'ALTER TABLE category_rules ADD COLUMN budget_item_id INTEGER REFERENCES budgets(id)'
  }
]
