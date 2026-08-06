const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'beehash.db');

// Ensure the directory exists (matters for local dev; Railway volume is pre-created)
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    payout_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pool_stats_cache (
    pool TEXT NOT NULL,
    address TEXT NOT NULL,
    data TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL,
    PRIMARY KEY (pool, address)
  );
`);

module.exports = db;
