import { Router } from 'express';
import crypto from 'node:crypto';
import { query, queryAll, queryOne } from '../db.ts';
import { requireAuth } from '../auth.ts';
import { resetPromptSeed } from '../seed.ts';

const router = Router();

function mapPrompt(row: Record<string, unknown>) {
  return {
    id: row.id,
    categoryLevel2Id: row.category_level2_id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    agentName: row.agent_name,
    agentDescription: row.agent_description,
    content: row.content,
    tags: row.tags ? JSON.parse(String(row.tags)) : [],
  };
}

async function assertPromptCategory(
  categoryLevel2Id: string,
): Promise<{ error?: string; status?: number }> {
  const parent = await queryOne<{ id: string; view_type: string }>(
    'SELECT id, view_type FROM category_level2 WHERE id = $1',
    [categoryLevel2Id],
  );
  if (!parent) {
    return { error: '단계 2가 존재하지 않습니다.', status: 400 };
  }
  if (parent.view_type === 'board') {
    return { error: '게시판 단계에는 프롬프트를 연결할 수 없습니다.', status: 400 };
  }
  return {};
}

router.post('/reset', requireAuth, async (_req, res) => {
  await resetPromptSeed();
  res.json({ ok: true });
});

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const categoryLevel2Id =
    typeof req.query.categoryLevel2Id === 'string' ? req.query.categoryLevel2Id : '';
  let sql = 'SELECT * FROM prompts WHERE 1=1';
  const params: string[] = [];
  if (categoryLevel2Id) {
    params.push(categoryLevel2Id);
    sql += ` AND category_level2_id = $${params.length}`;
  }
  if (q) {
    const like = `%${q}%`;
    const start = params.length + 1;
    sql += ` AND (title LIKE $${start} OR subtitle LIKE $${start + 1} OR agent_name LIKE $${start + 2} OR agent_description LIKE $${start + 3} OR content LIKE $${start + 4})`;
    params.push(like, like, like, like, like);
  }
  sql += ' ORDER BY title';
  const rows = await queryAll<Record<string, unknown>>(sql, params);
  res.json(rows.map(mapPrompt));
});

router.get('/:id', async (req, res) => {
  const row = await queryOne<Record<string, unknown>>('SELECT * FROM prompts WHERE id = $1', [
    req.params.id,
  ]);
  if (!row) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  res.json(mapPrompt(row));
});

router.post('/', requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const check = await assertPromptCategory(categoryLevel2Id);
  if (check.error) {
    res.status(check.status ?? 400).json({ error: check.error });
    return;
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      categoryLevel2Id,
      String(body.title ?? '').trim() || '제목 없음',
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    ],
  );
  const row = await queryOne<Record<string, unknown>>('SELECT * FROM prompts WHERE id = $1', [id]);
  res.status(201).json(mapPrompt(row as Record<string, unknown>));
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await queryOne('SELECT id FROM prompts WHERE id = $1', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const check = await assertPromptCategory(categoryLevel2Id);
  if (check.error) {
    res.status(check.status ?? 400).json({ error: check.error });
    return;
  }
  await query(
    `UPDATE prompts SET category_level2_id = $1, title = $2, subtitle = $3, agent_name = $4,
     agent_description = $5, content = $6, tags = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8`,
    [
      categoryLevel2Id,
      String(body.title ?? '').trim() || '제목 없음',
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      req.params.id,
    ],
  );
  const row = await queryOne<Record<string, unknown>>('SELECT * FROM prompts WHERE id = $1', [
    req.params.id,
  ]);
  res.json(mapPrompt(row as Record<string, unknown>));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
