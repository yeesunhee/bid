import { Router } from 'express';
import crypto from 'node:crypto';
import { isUniqueViolation, query, queryAll, queryOne } from '../db.ts';
import { requireAuth } from '../auth.ts';

const router = Router();

function mapLevel2(row: Record<string, unknown>) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description ?? '',
    sortOrder: row.sort_order,
    viewType: row.view_type === 'board' ? 'board' : 'prompt',
  };
}

const LEVEL2_SELECT = 'id, parent_id, name, description, sort_order, view_type';

router.get('/level1', async (_req, res) => {
  const rows = await queryAll('SELECT id, name, sort_order AS "sortOrder" FROM category_level1 ORDER BY sort_order, name');
  res.json(rows);
});

router.post('/level1', requireAuth, async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const sortOrder = Number(req.body.sortOrder ?? 0);
  if (!name) {
    res.status(400).json({ error: '단계 1 이름이 필요합니다.' });
    return;
  }
  try {
    const id = crypto.randomUUID();
    await query('INSERT INTO category_level1 (id, name, sort_order) VALUES ($1, $2, $3)', [
      id,
      name,
      sortOrder,
    ]);
    res.status(201).json({ id, name, sortOrder });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: '같은 이름의 단계 1이 이미 있습니다.' });
      return;
    }
    throw err;
  }
});

router.put('/level1/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await queryOne('SELECT id FROM category_level1 WHERE id = $1', [id]);
  if (!existing) {
    res.status(404).json({ error: '단계 1을 찾을 수 없습니다.' });
    return;
  }
  const name = String(req.body.name ?? '').trim();
  const sortOrder = Number(req.body.sortOrder ?? 0);
  try {
    await query(
      'UPDATE category_level1 SET name = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, sortOrder, id],
    );
    res.json({ id, name, sortOrder });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: '같은 이름의 단계 1이 이미 있습니다.' });
      return;
    }
    throw err;
  }
});

router.delete('/level1/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const child = await queryOne<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM category_level2 WHERE parent_id = $1',
    [id],
  );
  if ((child?.c ?? 0) > 0) {
    res.status(409).json({
      error: '하위 단계 2가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.',
      childCount: child?.c ?? 0,
    });
    return;
  }
  await query('DELETE FROM category_level1 WHERE id = $1', [id]);
  res.json({ ok: true });
});

router.get('/level2', async (req, res) => {
  const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
  const sql = parentId
    ? `SELECT ${LEVEL2_SELECT} FROM category_level2 WHERE parent_id = $1 ORDER BY sort_order, name`
    : `SELECT ${LEVEL2_SELECT} FROM category_level2 ORDER BY sort_order, name`;
  const rows = parentId
    ? await queryAll<Record<string, unknown>>(sql, [parentId])
    : await queryAll<Record<string, unknown>>(sql);
  res.json(rows.map(mapLevel2));
});

router.post('/level2', requireAuth, async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const parentId = String(req.body.parentId ?? '');
  const description = String(req.body.description ?? '');
  const sortOrder = Number(req.body.sortOrder ?? 0);
  if (!name || !parentId) {
    res.status(400).json({ error: '단계 2 이름과 상위 단계 1이 필요합니다.' });
    return;
  }
  const parent = await queryOne('SELECT id FROM category_level1 WHERE id = $1', [parentId]);
  if (!parent) {
    res.status(400).json({ error: '상위 단계 1이 존재하지 않습니다.' });
    return;
  }
  try {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, parentId, name, description, sortOrder, 'prompt'],
    );
    res.status(201).json({ id, parentId, name, description, sortOrder, viewType: 'prompt' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
      return;
    }
    throw err;
  }
});

router.put('/level2/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await queryOne<Record<string, unknown>>(
    `SELECT ${LEVEL2_SELECT} FROM category_level2 WHERE id = $1`,
    [id],
  );
  if (!existing) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const name = String(req.body.name ?? '').trim();
  const parentId = String(req.body.parentId ?? '');
  const description = String(req.body.description ?? '');
  const sortOrder = Number(req.body.sortOrder ?? 0);
  const parent = await queryOne('SELECT id FROM category_level1 WHERE id = $1', [parentId]);
  if (!parent) {
    res.status(400).json({ error: '상위 단계 1이 존재하지 않습니다.' });
    return;
  }
  try {
    await query(
      `UPDATE category_level2
       SET parent_id = $1, name = $2, description = $3, sort_order = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [parentId, name, description, sortOrder, id],
    );
    res.json({
      id,
      parentId,
      name,
      description,
      sortOrder,
      viewType: existing.view_type === 'board' ? 'board' : 'prompt',
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
      return;
    }
    throw err;
  }
});

router.delete('/level2/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await queryOne<{ id: string; view_type: string }>(
    'SELECT id, view_type FROM category_level2 WHERE id = $1',
    [id],
  );
  if (!existing) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const child = await queryOne<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM prompts WHERE category_level2_id = $1',
    [id],
  );
  if ((child?.c ?? 0) > 0) {
    res.status(409).json({
      error: '연결된 프롬프트가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.',
      promptCount: child?.c ?? 0,
    });
    return;
  }
  if (existing.view_type === 'board') {
    const posts = await queryOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM help_posts');
    if ((posts?.c ?? 0) > 0) {
      res.status(409).json({
        error: '게시물이 있어 삭제할 수 없습니다. 먼저 게시물을 삭제하세요.',
        postCount: posts?.c ?? 0,
      });
      return;
    }
  }
  await query('DELETE FROM category_level2 WHERE id = $1', [id]);
  res.json({ ok: true });
});

export default router;
