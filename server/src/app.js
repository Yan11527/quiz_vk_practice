const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { UPLOADS_DIR, corsOptions } = require('./config');
const { makeAuthMiddleware } = require('./middleware/auth');
const { createUploadMiddleware } = require('./middleware/upload');

const { createHealthRouter } = require('./routes/health.routes');
const { createAuthRouter } = require('./routes/auth.routes');
const { createUploadsRouter } = require('./routes/uploads.routes');
const { createQuizzesRouter } = require('./routes/quizzes.routes');
const { createSessionsRouter } = require('./routes/sessions.routes');
const { createHistoryRouter } = require('./routes/history.routes');

function createApp() {
  const app = express();
  const clientDistDir = path.resolve(__dirname, '..', '..', 'client', 'dist');
  const clientIndexHtml = path.join(clientDistDir, 'index.html');

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  app.disable('x-powered-by');
  app.use(cors(corsOptions));
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(express.json({ limit: '2mb' }));

  const auth = makeAuthMiddleware();
  const upload = createUploadMiddleware();

  app.use(createHealthRouter());
  app.use(createAuthRouter({ auth }));
  app.use(createUploadsRouter({ auth, upload }));
  app.use(createQuizzesRouter({ auth }));
  app.use(createSessionsRouter({ auth }));
  app.use(createHistoryRouter({ auth }));

  if (fs.existsSync(clientIndexHtml)) {
    app.use(express.static(clientDistDir));
    app.get(/.*/, (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/socket.io')
      ) {
        next();
        return;
      }

      res.sendFile(clientIndexHtml);
    });
  }

  app.use((error, _, res, __) => {
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  });

  return app;
}

module.exports = {
  createApp,
};
