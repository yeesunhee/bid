import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db.ts';
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

router.post('/reset', requireAuth, (_req, res) => {
  resetPromptSeed();
  res.json({ ok: true });
});

router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const categoryLevel2Id =
    typeof req.query.categoryLevel2Id === 'string' ? req.query.categoryLevel2Id : '';
  let sql = 'SELECT * FROM prompts WHERE 1=1';
  const params: string[] = [];
  if (categoryLevel2Id) {
    sql += ' AND category_level2_id = ?';
    params.push(categoryLevel2Id);
  }
  if (q) {
    sql +=
      ' AND (title LIKE ? OR subtitle LIKE ? OR agent_name LIKE ? OR agent_description LIKE ? OR content LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  sql += ' ORDER BY title';
  const rows = getDb().prepare(sql).all(...params) as Array<Record<string, unknown>>;
  res.json(rows.map(mapPrompt));
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  res.json(mapPrompt(row));
});

router.post('/', requireAuth, (req, res) => {
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const parent = getDb().prepare('SELECT id FROM category_level2 WHERE id = ?').get(categoryLevel2Id);
  if (!parent) {
    res.status(400).json({ error: '단계 2가 존재하지 않습니다.' });
    return;
  }
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      categoryLevel2Id,
      String(body.title ?? '').trim() || '제목 없음',
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    );
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json(mapPrompt(row));
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = getDb().prepare('SELECT id FROM prompts WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const parent = getDb().prepare('SELECT id FROM category_level2 WHERE id = ?').get(categoryLevel2Id);
  if (!parent) {
    res.status(400).json({ error: '단계 2가 존재하지 않습니다.' });
    return;
  }
  getDb()
    .prepare(
      `UPDATE prompts SET category_level2_id = ?, title = ?, subtitle = ?, agent_name = ?,
       agent_description = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .run(
      categoryLevel2Id,
      String(body.title ?? '').trim() || '제목 없음',
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      req.params.id,
    );
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id) as Record<
    string,
    unknown
  >;
  res.json(mapPrompt(row));
});

router.delete('/:id', requireAuth, (req, res) => {
  getDb().prepare('DELETE FROM prompts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
