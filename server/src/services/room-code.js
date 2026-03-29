const { getDb } = require('../db');
const { randomRoomCode } = require('../utils/session-utils');

async function createUniqueRoomCode() {
  const db = getDb();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomRoomCode();
    const existing = await db.get('SELECT id FROM quiz_sessions WHERE room_code = ?', [code]);
    if (!existing) {
      return code;
    }
  }

  throw new Error('Не удалось сгенерировать код комнаты.');
}

module.exports = {
  createUniqueRoomCode,
};
