const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbFile = process.env.SQLITE_FILE
  ? path.resolve(process.cwd(), process.env.SQLITE_FILE)
  : path.join(__dirname, 'marginmap.db');

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

module.exports = { db, run, get, all };
