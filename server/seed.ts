import crypto from 'node:crypto';
import { query, queryOne } from './db.ts';
import { SEED_LEVEL1, SEED_LEVEL2, SEED_PROMPTS, SEED_HELP_POSTS } from './seedPrompts.ts';
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

async function insertSeedCategoriesAndPrompts() {
  for (const row of SEED_LEVEL1) {
    await query(`INSERT INTO category_level1 (id, name, sort_order) VALUES ($1, $2, $3)`, [
      row.id,
      row.name,
      row.sortOrder,
    ]);
  }
  for (const row of SEED_LEVEL2) {
    await query(
      `INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.parentId, row.name, row.description, row.sortOrder, row.viewType],
    );
  }
  for (const row of SEED_PROMPTS) {
    await query(
      `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        row.id,
        row.categoryLevel2Id,
        row.title,
        row.subtitle,
        row.agentName,
        row.agentDescription,
        row.content,
        JSON.stringify(row.tags),
      ],
    );
  }
}

export async function seedIfEmpty(adminPassword: string) {
  const l1Count = await queryOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM category_level1');
  if ((l1Count?.c ?? 0) === 0) {
    await insertSeedCategoriesAndPrompts();
  }

  const admin = await queryOne('SELECT id FROM admin_settings WHERE id = 1');
  if (!admin) {
    await query('INSERT INTO admin_settings (id, password_hash) VALUES (1, $1)', [
      hashPassword(adminPassword),
    ]);
  }

  await seedEconomicCatalog();
  await seedDefaultBidScenario();
  await seedHelpPostsIfEmpty();
}

async function seedHelpPostsIfEmpty() {
  const count = await queryOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM help_posts');
  if ((count?.c ?? 0) > 0) return;
  const now = new Date().toISOString();
  for (const row of SEED_HELP_POSTS) {
    await query(
      `INSERT INTO help_posts (id, title, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [row.id, row.title, row.body, now, now],
    );
  }
}

export async function resetPromptSeed() {
  await query('DELETE FROM prompts');
  await query('DELETE FROM category_level2');
  await query('DELETE FROM category_level1');
  await insertSeedCategoriesAndPrompts();
}
