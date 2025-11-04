import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../data/marginmap.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

export default db;

export function initializeDatabase() {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  db.exec(schema);
  console.log('✓ Database initialized successfully');
}

// Lazy-initialized prepared statements
let _queries = null;

export const queries = new Proxy({}, {
  get(target, prop) {
    if (!_queries) {
      _queries = {
        // User queries
        getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
        createUser: db.prepare(`
          INSERT INTO users (email, password_hash, role, full_name)
          VALUES (?, ?, ?, ?)
        `),
        updateLastLogin: db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'),

        // Transaction queries
        insertTransaction: db.prepare(`
          INSERT INTO transactions (
            date, invoice_id, customer_name, region, sku_code, sku_name,
            category, qty_sold, unit_cost, unit_price, unit_discount, returned_units
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),

        getAllTransactions: db.prepare('SELECT * FROM transactions ORDER BY date DESC'),

        getTransactionsByDateRange: db.prepare(`
          SELECT * FROM transactions
          WHERE date >= ? AND date <= ?
          ORDER BY date DESC
        `),

        // Recommendation queries
        insertRecommendation: db.prepare(`
          INSERT INTO recommendations (
            category, issue_text, suggested_action, dollar_impact,
            impact_percent, priority, sku_code, customer_name, region
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),

        getAllRecommendations: db.prepare(`
          SELECT * FROM recommendations
          WHERE status = 'open'
          ORDER BY dollar_impact DESC, created_at DESC
        `),

        updateRecommendationStatus: db.prepare(`
          UPDATE recommendations
          SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
          WHERE id = ?
        `),

        // Upload queries
        insertUpload: db.prepare(`
          INSERT INTO uploads (filename, original_filename, uploaded_by, row_count, processing_status)
          VALUES (?, ?, ?, ?, ?)
        `),

        updateUploadStatus: db.prepare(`
          UPDATE uploads
          SET processing_status = ?, mapped = ?, error_log = ?
          WHERE id = ?
        `),

        // Settings queries
        getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
        setSetting: db.prepare(`
          INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `)
      };
    }
    return _queries[prop];
  }
});
