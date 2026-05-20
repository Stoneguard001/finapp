-- ── Seed category groups ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO category_groups (name, sort_order, color) VALUES
  ('Home',              1, '#ef4444'),
  ('Food & Drink',      2, '#f97316'),
  ('Transport',         3, '#eab308'),
  ('Health & Wellness', 4, '#06b6d4'),
  ('Lifestyle',         5, '#8b5cf6'),
  ('Financial',         6, '#14b8a6'),
  ('Income',            7, '#22c55e');

-- ── Seed default categories ───────────────────────────────────────────────────
INSERT OR IGNORE INTO categories (name, icon, color, group_id) VALUES
  ('Housing',        '🏠', '#ef4444', (SELECT id FROM category_groups WHERE name='Home')),
  ('Utilities',      '💡', '#84cc16', (SELECT id FROM category_groups WHERE name='Home')),
  ('Internet/Phone', '📱', '#22c55e', (SELECT id FROM category_groups WHERE name='Home')),
  ('Insurance',      '🛡️',  '#14b8a6', (SELECT id FROM category_groups WHERE name='Home')),
  ('Groceries',      '🛒', '#f97316', (SELECT id FROM category_groups WHERE name='Food & Drink')),
  ('Dining Out',     '🍽️',  '#f59e0b', (SELECT id FROM category_groups WHERE name='Food & Drink')),
  ('Transportation', '🚗', '#eab308', (SELECT id FROM category_groups WHERE name='Transport')),
  ('Healthcare',     '🏥', '#06b6d4', (SELECT id FROM category_groups WHERE name='Health & Wellness')),
  ('Personal Care',  '💅', '#fb7185', (SELECT id FROM category_groups WHERE name='Health & Wellness')),
  ('Pets',           '🐾', '#fbbf24', (SELECT id FROM category_groups WHERE name='Health & Wellness')),
  ('Shopping',       '🛍️',  '#8b5cf6', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Entertainment',  '🎬', '#a855f7', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Travel',         '✈️',  '#ec4899', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Subscriptions',  '📺', '#3b82f6', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Education',      '📚', '#f43f5e', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Gifts/Charity',  '🎁', '#a3e635', (SELECT id FROM category_groups WHERE name='Lifestyle')),
  ('Savings',        '💰', '#4ade80', (SELECT id FROM category_groups WHERE name='Financial')),
  ('Investments',    '📈', '#34d399', (SELECT id FROM category_groups WHERE name='Financial')),
  ('Transfer',       '🔄', '#94a3b8', (SELECT id FROM category_groups WHERE name='Financial')),
  ('Income',         '💵', '#22c55e', (SELECT id FROM category_groups WHERE name='Income')),
  ('Uncategorized',  '❓', '#475569', NULL);

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

-- ── Seed tags ─────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO tags (name, color) VALUES
  ('Recurring',      '#3b82f6'),
  ('Tax Deductible', '#22c55e'),
  ('Reimbursable',   '#f59e0b');

-- ── Seed placeholder budgets ──────────────────────────────────────────────────
INSERT INTO budgets (name, category_id, amount, period) VALUES
  ('Housing',       (SELECT id FROM categories WHERE name='Housing'),       0, 'monthly'),
  ('Groceries',     (SELECT id FROM categories WHERE name='Groceries'),     0, 'weekly'),
  ('Dining Out',    (SELECT id FROM categories WHERE name='Dining Out'),    0, 'weekly'),
  ('Utilities',     (SELECT id FROM categories WHERE name='Utilities'),     0, 'monthly'),
  ('Transportation',(SELECT id FROM categories WHERE name='Transportation'),0, 'monthly'),
  ('Subscriptions', (SELECT id FROM categories WHERE name='Subscriptions'), 0, 'monthly'),
  ('Healthcare',    (SELECT id FROM categories WHERE name='Healthcare'),    0, 'monthly'),
  ('Personal Care', (SELECT id FROM categories WHERE name='Personal Care'), 0, 'monthly');
