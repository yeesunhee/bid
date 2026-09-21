import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.ts';
import { seedIfEmpty } from './seed.ts';
import categoryRouter from './routes/categories.ts';
import promptRouter from './routes/prompts.ts';
import authRouter from './routes/auth.ts';
import economicRouter from './routes/economic.ts';
import helpRouter from './routes/helpPosts.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = Number(process.env.PORT || 3001);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  await initDb();
  await seedIfEmpty(ADMIN_PASSWORD);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/categories', categoryRouter);
  app.use('/api/prompts', promptRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/economic', economicRouter);
  app.use('/api/help-posts', helpRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });

  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`API server listening on http://127.0.0.1:${PORT}`);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
