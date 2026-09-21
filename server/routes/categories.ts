import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db.ts';
import { requireAuth } from '../auth.ts';

const router = Router();

router.get('/level1', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT id, name, sort_order AS sortOrder FROM category_level1 ORDER BY sort_order, name')
    .all();
  res.json(rows);
});

router.post('/level1', requireAuth, (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const sortOrder = Number(req.body.sortOrder ?? 0);
  if (!name) {
    res.status(400).json({ error: '단계 1 이름이 필요합니다.' });
    return;
  }
  try {
    const id = crypto.randomUUID();
    getDb()
      .prepare('INSERT INTO category_level1 (id, name, sort_order) VALUES (?, ?, ?)')
      .run(id, name, sortOrder);
    res.status(201).json({ id, name, sortOrder });
  } catch {
    res.status(409).json({ error: '같은 이름의 단계 1이 이미 있습니다.' });
  }
});

router.put('/level1/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = getDb().prepare('SELECT id FROM category_level1 WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '단계 1을 찾을 수 없습니다.' });
    return;
  }
  const name = String(req.body.name ?? '').trim();
  const sortOrder = Number(req.body.sortOrder ?? 0);
  try {
    getDb()
      .prepare(
        'UPDATE category_level1 SET name = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      )
      .run(name, sortOrder, id);
    res.json({ id, name, sortOrder });
  } catch {
    res.status(409).json({ error: '같은 이름의 단계 1이 이미 있습니다.' });
  }
});

router.delete('/level1/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const child = getDb()
    .prepare('SELECT COUNT(*) AS c FROM category_level2 WHERE parent_id = ?')
    .get(id) as { c: number };
  if (child.c > 0) {
    res.status(409).json({
      error: '하위 단계 2가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.',
      childCount: child.c,
    });
    return;
  }
  getDb().prepare('DELETE FROM category_level1 WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.get('/level2', (req, res) => {
  const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
  const sql = parentId
    ? 'SELECT id, parent_id AS parentId, name, description, sort_order AS sortOrder FROM category_level2 WHERE parent_id = ? ORDER BY sort_order, name'
    : 'SELECT id, parent_id AS parentId, name, description, sort_order AS sortOrder FROM category_level2 ORDER BY sort_order, name';
  const rows = parentId ? getDb().prepare(sql).all(parentId) : getDb().prepare(sql).all();
  res.json(rows);
});

router.post('/level2', requireAuth, (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const parentId = String(req.body.parentId ?? '');
  const description = String(req.body.description ?? '');
  const sortOrder = Number(req.body.sortOrder ?? 0);
  if (!name || !parentId) {
    res.status(400).json({ error: '단계 2 이름과 상위 단계 1이 필요합니다.' });
    return;
  }
  const parent = getDb().prepare('SELECT id FROM category_level1 WHERE id = ?').get(parentId);
  if (!parent) {
    res.status(400).json({ error: '상위 단계 1이 존재하지 않습니다.' });
    return;
  }
  try {
    const id = crypto.randomUUID();
    getDb()
      .prepare(
        'INSERT INTO category_level2 (id, parent_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, parentId, name, description, sortOrder);
    res.status(201).json({ id, parentId, name, description, sortOrder });
  } catch {
    res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
  }
});

router.put('/level2/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = getDb().prepare('SELECT id FROM category_level2 WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const name = String(req.body.name ?? '').trim();
  const parentId = String(req.body.parentId ?? '');
  const description = String(req.body.description ?? '');
  const sortOrder = Number(req.body.sortOrder ?? 0);
  const parent = getDb().prepare('SELECT id FROM category_level1 WHERE id = ?').get(parentId);
  if (!parent) {
    res.status(400).json({ error: '상위 단계 1이 존재하지 않습니다.' });
    return;
  }
  try {
    getDb()
      .prepare(
        `UPDATE category_level2
         SET parent_id = ?, name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(parentId, name, description, sortOrder, id);
    res.json({ id, parentId, name, description, sortOrder });
  } catch {
    res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
  }
});

router.delete('/level2/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const child = getDb()
    .prepare('SELECT COUNT(*) AS c FROM prompts WHERE category_level2_id = ?')
    .get(id) as { c: number };
  if (child.c > 0) {
    res.status(409).json({
      error: '연결된 프롬프트가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.',
      promptCount: child.c,
    });
    return;
  }
  getDb().prepare('DELETE FROM category_level2 WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
