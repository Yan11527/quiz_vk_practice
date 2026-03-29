const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../config');

function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

async function resolveUserFromToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  const db = getDb();
  const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [
    payload.userId,
  ]);

  if (!user) {
    const error = new Error('Пользователь не найден.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
}

function makeAuthMiddleware() {
  return async (req, res, next) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация.' });
    }

    try {
      req.user = await resolveUserFromToken(token);
      next();
    } catch (error) {
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(401).json({ error: 'Пользователь не найден.' });
      }
      return res.status(401).json({ error: 'Недействительный токен.' });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав.' });
    }

    next();
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  getTokenFromHeader,
  resolveUserFromToken,
  makeAuthMiddleware,
  requireRole,
  toPublicUser,
  createToken,
};
