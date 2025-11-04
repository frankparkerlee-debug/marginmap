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

CREATE TABLE IF NOT EXISTS sku_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_code TEXT UNIQUE NOT NULL,
  target_margin_percent REAL DEFAULT 55,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business type configuration
CREATE TABLE IF NOT EXISTS business_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_type TEXT NOT NULL CHECK(business_type IN ('manufacturer', 'wholesaler', 'retailer')),
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Expense categories for each business type
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_type TEXT NOT NULL CHECK(business_type IN ('manufacturer', 'wholesaler', 'retailer')),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_type, category_code)
);

-- Transaction-level expense tracking
CREATE TABLE IF NOT EXISTS transaction_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  expense_category_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id)
);

-- Dynamic margin benchmarks by category
CREATE TABLE IF NOT EXISTS margin_benchmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK(business_type IN ('manufacturer', 'wholesaler', 'retailer')),
  target_margin_min REAL NOT NULL,
  target_margin_max REAL NOT NULL,
  industry_average REAL,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, business_type)
);

-- Historical margin tracking for trend analysis
CREATE TABLE IF NOT EXISTS margin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_code TEXT NOT NULL,
  customer_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue REAL NOT NULL,
  cogs REAL NOT NULL,
  total_expenses REAL DEFAULT 0,
  margin_percent REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_sku ON transactions(sku_code);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_name);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_region ON transactions(region);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category);
CREATE INDEX IF NOT EXISTS idx_transaction_expenses_transaction ON transaction_expenses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_expenses_category ON transaction_expenses(expense_category_id);
CREATE INDEX IF NOT EXISTS idx_margin_benchmarks_category ON margin_benchmarks(category, business_type);
CREATE INDEX IF NOT EXISTS idx_margin_history_sku ON margin_history(sku_code);
CREATE INDEX IF NOT EXISTS idx_margin_history_period ON margin_history(period_start, period_end);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('target_margin_percent', '55');
INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'MarginMap');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
INSERT OR IGNORE INTO settings (key, value) VALUES ('business_type', 'manufacturer');

-- Insert default business config (manufacturer active by default)
INSERT OR IGNORE INTO business_config (business_type, is_active) VALUES ('manufacturer', 1);
INSERT OR IGNORE INTO business_config (business_type, is_active) VALUES ('wholesaler', 0);
INSERT OR IGNORE INTO business_config (business_type, is_active) VALUES ('retailer', 0);

-- Manufacturer expense categories
INSERT OR IGNORE INTO expense_categories (business_type, category_code, category_name, description) VALUES
  ('manufacturer', 'raw_materials', 'Raw Materials', 'Cost of raw materials and components'),
  ('manufacturer', 'production_loss', 'Production Loss/Damage', 'Material waste and damaged goods during production'),
  ('manufacturer', 'direct_labor', 'Direct Labor', 'Production line labor costs'),
  ('manufacturer', 'equipment', 'Equipment & Maintenance', 'Manufacturing equipment costs and maintenance'),
  ('manufacturer', 'quality_control', 'Quality Control', 'Testing and quality assurance costs'),
  ('manufacturer', 'packaging', 'Packaging Materials', 'Product packaging and labeling costs');

-- Wholesaler expense categories
INSERT OR IGNORE INTO expense_categories (business_type, category_code, category_name, description) VALUES
  ('wholesaler', 'acquisition_cost', 'Product Acquisition', 'Cost to acquire products from manufacturers'),
  ('wholesaler', 'storage', 'Storage & Warehousing', 'Warehouse rent, utilities, and storage costs'),
  ('wholesaler', 'logistics', 'Logistics & Freight', 'Inbound and outbound shipping costs'),
  ('wholesaler', 'distribution', 'Distribution', 'Last-mile delivery and distribution costs'),
  ('wholesaler', 'handling', 'Handling & Processing', 'Order picking, packing, and processing'),
  ('wholesaler', 'inventory_loss', 'Inventory Shrinkage', 'Damaged, lost, or expired inventory');

-- Retailer expense categories
INSERT OR IGNORE INTO expense_categories (business_type, category_code, category_name, description) VALUES
  ('retailer', 'product_cost', 'Product Acquisition', 'Wholesale cost of goods purchased'),
  ('retailer', 'advertising', 'Advertising & Marketing', 'Marketing campaigns, promotions, and advertising'),
  ('retailer', 'transportation', 'Transportation', 'Shipping and delivery costs'),
  ('retailer', 'store_operations', 'Store Operations', 'Rent, utilities, store maintenance'),
  ('retailer', 'staffing', 'Labor & Staffing', 'Retail staff wages and benefits'),
  ('retailer', 'shrinkage', 'Shrinkage', 'Theft, damage, and inventory loss');

-- Dynamic margin benchmarks by category and business type
INSERT OR IGNORE INTO margin_benchmarks (category, business_type, target_margin_min, target_margin_max, industry_average) VALUES
  -- Manufacturer benchmarks
  ('Cleaning', 'manufacturer', 45, 65, 55),
  ('Personal Care', 'manufacturer', 50, 70, 60),
  ('Medical Supplies', 'manufacturer', 30, 55, 42),
  ('Paper Goods', 'manufacturer', 35, 55, 45),
  ('Food & Beverage', 'manufacturer', 25, 45, 35),
  ('Health & Wellness', 'manufacturer', 45, 65, 55),
  ('Beauty', 'manufacturer', 55, 75, 65),
  ('Home Goods', 'manufacturer', 40, 60, 50),
  -- Wholesaler benchmarks (typically 10-15% lower due to added costs)
  ('Cleaning', 'wholesaler', 30, 50, 40),
  ('Personal Care', 'wholesaler', 35, 55, 45),
  ('Medical Supplies', 'wholesaler', 20, 40, 30),
  ('Paper Goods', 'wholesaler', 25, 45, 35),
  ('Food & Beverage', 'wholesaler', 15, 30, 22),
  ('Health & Wellness', 'wholesaler', 30, 50, 40),
  ('Beauty', 'wholesaler', 40, 60, 50),
  ('Home Goods', 'wholesaler', 25, 45, 35),
  -- Retailer benchmarks (typically 20-30% lower due to all value chain costs)
  ('Cleaning', 'retailer', 25, 40, 32),
  ('Personal Care', 'retailer', 30, 45, 37),
  ('Medical Supplies', 'retailer', 15, 30, 22),
  ('Paper Goods', 'retailer', 20, 35, 27),
  ('Food & Beverage', 'retailer', 10, 25, 17),
  ('Health & Wellness', 'retailer', 25, 40, 32),
  ('Beauty', 'retailer', 35, 55, 45),
  ('Home Goods', 'retailer', 20, 35, 27);
