-- MarginMap Database Schema
-- SQLite schema for local development and production

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'analyst',
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  invoice_id TEXT,
  customer_name TEXT NOT NULL,
  region TEXT,
  sku_code TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  category TEXT,
  qty_sold REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  unit_discount REAL DEFAULT 0,
  returned_units REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  issue_text TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  dollar_impact REAL DEFAULT 0,
  impact_percent REAL DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  sku_code TEXT,
  customer_name TEXT,
  region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER,
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_filename TEXT,
  uploaded_by INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  row_count INTEGER DEFAULT 0,
  mapped BOOLEAN DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  error_log TEXT,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_sku ON transactions(sku_code);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_name);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_region ON transactions(region);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('target_margin_percent', '55');
INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'MarginMap');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
