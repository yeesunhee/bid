import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'posco_prompts.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error('Database is not initialized');
  }
  return db;
}

export function initDb(): DatabaseSync {
  fs.mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_level1 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_level2 (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES category_level1(id) ON DELETE RESTRICT,
      UNIQUE(parent_id, name)
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      category_level2_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      agent_name TEXT NOT NULL,
      agent_description TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_level2_id) REFERENCES category_level2(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS economic_indicator_catalog (
      indicator_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('ECOS', 'EIA', 'IMF')),
      display_name_ko TEXT NOT NULL,
      category TEXT NOT NULL,
      frequency TEXT NOT NULL,
      unit TEXT,
      currency TEXT,
      mapping_json TEXT NOT NULL,
      source_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS economic_observations (
      id TEXT PRIMARY KEY,
      indicator_key TEXT NOT NULL,
      period TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      currency TEXT,
      source_timestamp TEXT,
      fetched_at TEXT NOT NULL,
      source_reference TEXT,
      is_estimated INTEGER NOT NULL DEFAULT 0,
      UNIQUE(indicator_key, period),
      FOREIGN KEY (indicator_key) REFERENCES economic_indicator_catalog(indicator_key)
    );

    CREATE TABLE IF NOT EXISTS bid_cost_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_cost REAL,
      base_fx REAL,
      weights_json TEXT NOT NULL,
      risk_weights_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}
