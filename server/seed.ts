import crypto from 'node:crypto';
import { getDb } from './db.ts';
import { SEED_LEVEL1, SEED_LEVEL2, SEED_PROMPTS } from './seedPrompts.ts';
import { seedEconomicCatalog, seedDefaultBidScenario } from './seedEconomic.ts';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split(':');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length) as Buffer;
  return crypto.timingSafeEqual(actual, expected);
}

function insertSeedCategoriesAndPrompts() {
  const db = getDb();
  const insertL1 = db.prepare(
    `INSERT INTO category_level1 (id, name, sort_order) VALUES (?, ?, ?)`,
  );
  const insertL2 = db.prepare(
    `INSERT INTO category_level2 (id, parent_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );
  const insertPrompt = db.prepare(
    `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const row of SEED_LEVEL1) {
    insertL1.run(row.id, row.name, row.sortOrder);
  }
  for (const row of SEED_LEVEL2) {
    insertL2.run(row.id, row.parentId, row.name, row.description, row.sortOrder);
  }
  for (const row of SEED_PROMPTS) {
    insertPrompt.run(
      row.id,
      row.categoryLevel2Id,
      row.title,
      row.subtitle,
      row.agentName,
      row.agentDescription,
      row.content,
      JSON.stringify(row.tags),
    );
  }
}

export function seedIfEmpty(adminPassword: string) {
  const db = getDb();
  const l1Count = db.prepare('SELECT COUNT(*) AS c FROM category_level1').get() as { c: number };
  if (l1Count.c === 0) {
    insertSeedCategoriesAndPrompts();
  }

  const admin = db.prepare('SELECT id FROM admin_settings WHERE id = 1').get();
  if (!admin) {
    db.prepare('INSERT INTO admin_settings (id, password_hash) VALUES (1, ?)').run(
      hashPassword(adminPassword),
    );
  }

  seedEconomicCatalog();
  seedDefaultBidScenario();
}

export function resetPromptSeed() {
  const db = getDb();
  db.exec('DELETE FROM prompts;');
  db.exec('DELETE FROM category_level2;');
  db.exec('DELETE FROM category_level1;');
  insertSeedCategoriesAndPrompts();
}
