const bcrypt = require('bcryptjs');
const { Router } = require('express');
const { getDb } = require('../db');
const { createToken, toPublicUser } = require('../middleware/auth');
const { schemas } = require('../validation/schemas');
const { validateBody } = require('../validation/validate-body');

function createAuthRouter({ auth }) {
  const router = Router();

  router.post('/api/auth/register', async (req, res) => {
    const input = validateBody(schemas.register, req.body, res);
    if (!input) return;

    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [input.email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует.' });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await db.run(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `,
      [input.name.trim(), input.email.toLowerCase(), passwordHash, input.role],
    );

    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [
      result.lastID,
    ]);

    return res.status(201).json({
      token: createToken(user.id),
      user: toPublicUser(user),
    });
  });

  router.post('/api/auth/login', async (req, res) => {
    const input = validateBody(schemas.login, req.body, res);
    if (!input) return;

    const db = getDb();
    const user = await db.get(
      `
        SELECT id, name, email, role, created_at, password_hash
        FROM users
        WHERE email = ?
      `,
      [input.email.toLowerCase()],
    );

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }

    const passwordOk = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }

    return res.json({
      token: createToken(user.id),
      user: toPublicUser(user),
    });
  });

  router.get('/api/me', auth, async (req, res) => {
    res.json({ user: toPublicUser(req.user) });
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
