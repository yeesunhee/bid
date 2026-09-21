import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(__dirname, 'data');
export const helpUploadsDir = path.join(dataDir, 'help-uploads');

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database is not initialized');
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await queryAll<T>(text, params);
  return rows[0];
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

function sslOption(connectionString: string): boolean | { rejectUnauthorized: boolean } | undefined {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    const sslmode = (url.searchParams.get('sslmode') || url.searchParams.get('ssl') || '').toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (sslmode === 'disable' || sslmode === 'false') return undefined;
    if (sslmode === 'verify-full' || sslmode === 'verify-ca') {
      return { rejectUnauthorized: true };
    }
    if (!isLocal || sslmode === 'require' || sslmode === 'true' || sslmode === 'no-verify') {
      return { rejectUnauthorized: false };
    }
  } catch {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export async function initDb(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL 환경변수가 없습니다. 프로세스 환경변수로 PostgreSQL 접속 문자열을 설정하세요. .env에는 두지 않습니다.',
    );
  }

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(helpUploadsDir, { recursive: true });

  pool = new Pool({ connectionString, ssl: sslOption(connectionString) });

  await pool.query(`
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
      view_type TEXT NOT NULL DEFAULT 'prompt' CHECK (view_type IN ('prompt', 'board')),
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
      value DOUBLE PRECISION NOT NULL,
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
      base_cost DOUBLE PRECISION,
      base_fx DOUBLE PRECISION,
      weights_json TEXT NOT NULL,
      risk_weights_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS help_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS help_attachments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES help_posts(id) ON DELETE CASCADE
    );
  `);

  await migrateHelpBoard();
  return pool;
}

async function tableHasColumn(table: string, column: string): Promise<boolean> {
  const row = await queryOne<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS present`,
    [table, column],
  );
  return Boolean(row?.present);
}

async function migrateHelpBoard() {
  if (!(await tableHasColumn('category_level2', 'view_type'))) {
    await query(
      `ALTER TABLE category_level2 ADD COLUMN view_type TEXT NOT NULL DEFAULT 'prompt'`,
    );
  }

  await query(
    `UPDATE category_level2
     SET view_type = 'board'
     WHERE id = 'l2-help'
        OR (
          name IN ('도움말', '참고 문서 모음')
          AND parent_id IN (SELECT id FROM category_level1 WHERE name IN ('기타', '게시판'))
        )`,
  );

  await query(
    `UPDATE category_level1
     SET name = '게시판', updated_at = CURRENT_TIMESTAMP
     WHERE id = 'l1-etc' AND name = '기타'`,
  );
  await query(
    `UPDATE category_level2
     SET name = '참고 문서 모음', updated_at = CURRENT_TIMESTAMP
     WHERE id = 'l2-help' AND name = '도움말'`,
  );
  await query(
    `UPDATE category_level2
     SET name = '참고 문서 모음', updated_at = CURRENT_TIMESTAMP
     WHERE name = '도움말'
       AND parent_id IN (SELECT id FROM category_level1 WHERE name IN ('기타', '게시판') OR id = 'l1-etc')`,
  );
}
