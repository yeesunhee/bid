import { Router } from 'express';
import { login } from '../auth.ts';

const router = Router();

router.post('/login', (req, res) => {
  const password = String(req.body.password ?? '');
  const token = login(password);
  if (!token) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }
  res.json({ token });
});

export default router;
