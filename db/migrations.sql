BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'analyst',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  row_count INTEGER NOT NULL DEFAULT 0,
  mapped INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upload_id INTEGER NOT NULL,
  date_of_service TEXT NOT NULL,
  invoice_id TEXT,
  customer_name TEXT NOT NULL,
  payer_name TEXT,
  sku_code TEXT NOT NULL,
  description TEXT,
  qty REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price_billed REAL NOT NULL DEFAULT 0,
  unit_price_paid REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_sku ON transactions (sku_code);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions (customer_name);
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON transactions (payer_name);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date_of_service);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions (invoice_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  issue_text TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  dollar_impact REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
