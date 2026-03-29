const http = require('http');

const { createApp } = require('./app');
const { PORT, NODE_ENV, CLIENT_ORIGINS } = require('./config');
const { initDatabase } = require('./db');
const { setupSocket } = require('./socket/setup-socket');

async function main() {
  await initDatabase();

  const app = createApp();
  const server = http.createServer(app);
  setupSocket(server);

  server.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} (env: ${NODE_ENV}, allowed origins: ${CLIENT_ORIGINS.join(', ')})`,
    );
  });
}

main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
