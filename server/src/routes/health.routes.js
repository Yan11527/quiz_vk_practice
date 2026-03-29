const { Router } = require('express');
const { NODE_ENV } = require('../config');

function createHealthRouter() {
  const router = Router();

  router.get('/api/health', (_, res) => {
    res.json({ ok: true, service: 'kviz-komnata-server', environment: NODE_ENV });
  });

  router.get('/health', (_, res) => {
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createHealthRouter,
};
