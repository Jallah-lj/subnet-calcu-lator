import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "app.db");

let db: Database.Database | null = null;

function ensureDatabase() {
  if (db) return db;

  fs.mkdirSync(dbDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      default_cidr INTEGER NOT NULL DEFAULT 24,
      theme TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calculator_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ip TEXT NOT NULL,
      cidr INTEGER NOT NULL,
      network TEXT NOT NULL,
      broadcast TEXT NOT NULL,
      mask TEXT NOT NULL,
      usable_hosts TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      payload_json TEXT,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_failed_at TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb() {
  return ensureDatabase();
}
