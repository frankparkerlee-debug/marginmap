require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const migrationsPath = path.join(__dirname, '..', 'db', 'migrations.sql');
const sql = fs.readFileSync(migrationsPath, 'utf-8');

db.exec(sql, (err) => {
  if (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  console.log('Database migrated successfully.');
  process.exit(0);
});
