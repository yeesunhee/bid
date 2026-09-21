import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb } from './db.ts';
import { verifyPassword } from './seed.ts';

const sessions = new Map<string, { expiresAt: number }>();
const SESSION_MS = 8 * 60 * 60 * 1000;

export function login(password: string): string | null {
  const row = getDb().prepare('SELECT password_hash FROM admin_settings WHERE id = 1').get() as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return null;
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_MS });
  return token;
}

export function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!isAuthenticated(token)) {
    res.status(401).json({ error: '관리자 인증이 필요합니다.' });
    return;
  }
  next();
}
