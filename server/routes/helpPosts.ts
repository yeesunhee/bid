import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { helpUploadsDir, query, queryAll, queryOne } from '../db.ts';
import { requireAuth } from '../auth.ts';

const router = Router();

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);
const BLOCKED_EXT = new Set(['.exe', '.bat', '.cmd', '.js', '.sh', '.msi', '.com', '.scr', '.ps1']);

const tmpDir = path.join(helpUploadsDir, '_tmp');
fs.mkdirSync(tmpDir, { recursive: true });

function extensionOf(name: string): string {
  return path.extname(name).toLowerCase();
}

function isAllowedFile(originalName: string): boolean {
  const ext = extensionOf(originalName);
  if (!ext || BLOCKED_EXT.has(ext)) return false;
  return ALLOWED_EXT.has(ext);
}

/** Multer가 UTF-8 파일명을 Latin-1로 해석한 경우 한글을 복원한다. */
function decodeOriginalFilename(name: string): string {
  const sanitized = path
    .basename(String(name ?? ''))
    .replace(/[\r\n"]/g, '_')
    .replace(/[\\/]/g, '_');
  if (!sanitized) return 'unnamed';
  if (/[\uAC00-\uD7A3]/.test(sanitized)) return sanitized;
  const decoded = Buffer.from(sanitized, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD')) return sanitized;
  return path
    .basename(decoded)
    .replace(/[\r\n"]/g, '_')
    .replace(/[\\/]/g, '_');
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    file.originalname = decodeOriginalFilename(file.originalname);
    if (!isAllowedFile(file.originalname)) {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
      return;
    }
    cb(null, true);
  },
});

function isoNow(): string {
  return new Date().toISOString();
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const raw = String(value ?? '');
  if (!raw) return isoNow();
  if (raw.includes('T')) return raw;
  return raw.replace(' ', 'T') + 'Z';
}

function mapAttachment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    originalName: String(row.original_name),
    storedName: String(row.stored_name),
    mimeType: String(row.mime_type ?? ''),
    sizeBytes: Number(row.size_bytes ?? 0),
    createdAt: toIso(row.created_at),
  };
}

async function attachmentsFor(postId: string) {
  const rows = await queryAll<Record<string, unknown>>(
    'SELECT * FROM help_attachments WHERE post_id = $1 ORDER BY created_at',
    [postId],
  );
  return rows.map(mapAttachment);
}

async function mapPost(row: Record<string, unknown>, includeBody: boolean) {
  const id = String(row.id);
  const attachments = await attachmentsFor(id);
  return {
    id,
    title: String(row.title),
    body: includeBody ? String(row.body ?? '') : '',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    attachments,
    attachmentCount: attachments.length,
  };
}

type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  path: string;
};

function collectedFiles(req: Request): UploadedFile[] {
  const files = (req as Request & { files?: UploadedFile[] | Record<string, UploadedFile[]> }).files;
  if (!files) return [];
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  return list.filter((file) => file.fieldname === 'files' || file.fieldname === 'files[]');
}

function cleanupTemps(files: UploadedFile[]) {
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
}

function postDir(postId: string): string {
  return path.join(helpUploadsDir, postId);
}

function removePostFiles(postId: string) {
  const dir = postDir(postId);
  fs.rmSync(dir, { recursive: true, force: true });
}

function sanitizeDownloadName(name: string): string {
  return path.basename(name).replace(/[\r\n"]/g, '_').replace(/[\\/]/g, '_');
}

function asciiFallbackName(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/_+/g, '_') || 'download';
  return ascii;
}

function contentDisposition(originalName: string): string {
  const original = sanitizeDownloadName(originalName);
  const encoded = encodeURIComponent(original);
  const fallback = asciiFallbackName(original);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

router.get('/', async (_req, res) => {
  const rows = await queryAll<Record<string, unknown>>(
    'SELECT * FROM help_posts ORDER BY created_at DESC',
  );
  const posts = await Promise.all(rows.map((row) => mapPost(row, false)));
  res.json(posts);
});

router.get('/:id', async (req, res) => {
  const row = await queryOne<Record<string, unknown>>('SELECT * FROM help_posts WHERE id = $1', [
    req.params.id,
  ]);
  if (!row) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  res.json(await mapPost(row, true));
});

router.get('/:id/attachments/:attachmentId', async (req, res) => {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM help_attachments WHERE id = $1 AND post_id = $2',
    [req.params.attachmentId, req.params.id],
  );
  if (!row) {
    res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
    return;
  }
  const filePath = path.join(postDir(String(row.post_id)), String(row.stored_name));
  const resolved = path.resolve(filePath);
  const root = path.resolve(postDir(String(row.post_id)));
  if (!resolved.startsWith(root) || !fs.existsSync(resolved)) {
    res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
    return;
  }
  res.setHeader('Content-Disposition', contentDisposition(String(row.original_name)));
  if (row.mime_type) res.setHeader('Content-Type', String(row.mime_type));
  res.sendFile(resolved);
});

router.post('/', requireAuth, (req, res) => {
  upload.any()(req, res, (err) => {
    void (async () => {
      const files = collectedFiles(req);
      if (err) {
        cleanupTemps(files);
        const message =
          err instanceof multer.MulterError
            ? err.code === 'LIMIT_FILE_SIZE'
              ? '파일당 최대 크기는 20MB입니다.'
              : err.code === 'LIMIT_FILE_COUNT'
                ? '한 글당 파일은 최대 10개입니다.'
                : err.message
            : err instanceof Error
              ? err.message
              : '파일 업로드에 실패했습니다.';
        res.status(400).json({ error: message });
        return;
      }

      const title = String(req.body?.title ?? '').trim();
      const body = String(req.body?.body ?? '');
      if (!title) {
        cleanupTemps(files);
        res.status(400).json({ error: '제목을 입력하세요.' });
        return;
      }
      if (files.length > MAX_FILES) {
        cleanupTemps(files);
        res.status(400).json({ error: '한 글당 파일은 최대 10개입니다.' });
        return;
      }
      for (const file of files) {
        file.originalname = decodeOriginalFilename(file.originalname);
        if (file.size > MAX_FILE_BYTES) {
          cleanupTemps(files);
          res.status(400).json({ error: '파일당 최대 크기는 20MB입니다.' });
          return;
        }
        if (!isAllowedFile(file.originalname)) {
          cleanupTemps(files);
          res.status(400).json({ error: `허용되지 않는 파일 형식입니다: ${file.originalname}` });
          return;
        }
      }

      const id = crypto.randomUUID();
      const now = isoNow();
      await query(
        'INSERT INTO help_posts (id, title, body, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [id, title, body, now, now],
      );

      const dest = postDir(id);
      try {
        if (files.length) fs.mkdirSync(dest, { recursive: true });
        for (const file of files) {
          const attId = crypto.randomUUID();
          const originalName = decodeOriginalFilename(file.originalname);
          const storedName = `${attId}${extensionOf(originalName)}`;
          const target = path.join(dest, storedName);
          fs.renameSync(file.path, target);
          await query(
            `INSERT INTO help_attachments (id, post_id, original_name, stored_name, mime_type, size_bytes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [attId, id, originalName, storedName, file.mimetype || '', file.size, now],
          );
        }
      } catch (moveErr) {
        cleanupTemps(files);
        removePostFiles(id);
        await query('DELETE FROM help_posts WHERE id = $1', [id]);
        res.status(500).json({
          error: moveErr instanceof Error ? moveErr.message : '첨부파일 저장에 실패했습니다.',
        });
        return;
      }

      const row = await queryOne<Record<string, unknown>>('SELECT * FROM help_posts WHERE id = $1', [
        id,
      ]);
      res.status(201).json(await mapPost(row as Record<string, unknown>, true));
    })().catch((asyncErr) => {
      cleanupTemps(collectedFiles(req));
      if (!res.headersSent) {
        res.status(500).json({
          error: asyncErr instanceof Error ? asyncErr.message : '게시물 저장에 실패했습니다.',
        });
      }
    });
  });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await queryOne('SELECT id FROM help_posts WHERE id = $1', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  await query('DELETE FROM help_attachments WHERE post_id = $1', [req.params.id]);
  await query('DELETE FROM help_posts WHERE id = $1', [req.params.id]);
  removePostFiles(req.params.id);
  res.json({ ok: true });
});

export default router;
