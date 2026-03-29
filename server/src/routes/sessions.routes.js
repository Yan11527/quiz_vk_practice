const { Router } = require('express');
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');
const { getLeaderboard, ensureRuntime, getCurrentQuestionPayload } = require('../runtime/session-runtime');
const { schemas } = require('../validation/schemas');
const { validateBody } = require('../validation/validate-body');
const { createUniqueRoomCode } = require('../services/room-code');

function createSessionsRouter({ auth }) {
  const router = Router();

  router.post('/api/sessions/start', auth, requireRole('organizer'), async (req, res) => {
    const input = validateBody(schemas.startSession, req.body, res);
    if (!input) return;

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id, title FROM quizzes WHERE id = ?', [input.quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Запускать может только автор квиза.' });
    }

    const questionCountRow = await db.get('SELECT COUNT(*) AS count FROM questions WHERE quiz_id = ?', [
      input.quizId,
    ]);
    if (Number(questionCountRow.count) === 0) {
      return res.status(400).json({ error: 'Для запуска добавьте хотя бы один вопрос.' });
    }

    const roomCode = await createUniqueRoomCode();
    const insert = await db.run(
      `
        INSERT INTO quiz_sessions (quiz_id, organizer_id, room_code, status)
        VALUES (?, ?, ?, 'waiting')
      `,
      [input.quizId, req.user.id, roomCode],
    );

    res.status(201).json({
      session: {
        id: insert.lastID,
        quizId: input.quizId,
        quizTitle: quiz.title,
        roomCode,
        status: 'waiting',
      },
    });
  });

  router.post('/api/sessions/join', auth, requireRole('participant'), async (req, res) => {
    const input = validateBody(schemas.joinSession, req.body, res);
    if (!input) return;

    const roomCode = input.roomCode.trim().toUpperCase();
    const db = getDb();
    const session = await db.get(
      `
        SELECT qs.id, qs.room_code, qs.status, q.title
        FROM quiz_sessions qs
        INNER JOIN quizzes q ON q.id = qs.quiz_id
        WHERE qs.room_code = ?
      `,
      [roomCode],
    );

    if (!session) {
      return res.status(404).json({ error: 'Комната не найдена.' });
    }

    if (session.status === 'finished') {
      return res.status(400).json({ error: 'Сессия уже завершена.' });
    }

    await db.run(
      `
        INSERT OR IGNORE INTO session_participants (session_id, user_id)
        VALUES (?, ?)
      `,
      [session.id, req.user.id],
    );

    res.json({
      roomCode,
      session: {
        id: session.id,
        status: session.status,
        quizTitle: session.title,
      },
    });
  });

  router.get('/api/sessions/:roomCode/state', auth, async (req, res) => {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const db = getDb();

    const session = await db.get(
      `
        SELECT qs.id, qs.quiz_id, qs.organizer_id, qs.room_code, qs.status, qs.current_question_index,
               q.title, q.category, q.rules
        FROM quiz_sessions qs
        INNER JOIN quizzes q ON q.id = qs.quiz_id
        WHERE qs.room_code = ?
      `,
      [roomCode],
    );

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена.' });
    }

    if (req.user.role === 'organizer' && session.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Эта сессия принадлежит другому организатору.' });
    }

    if (req.user.role === 'participant') {
      const membership = await db.get('SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?', [
        session.id,
        req.user.id,
      ]);
      if (!membership) {
        return res.status(403).json({ error: 'Сначала подключитесь к квизу по коду комнаты.' });
      }
    }

    const runtime = await ensureRuntime(roomCode);
    const leaderboard = await getLeaderboard(session.id);
    const currentQuestion = runtime ? getCurrentQuestionPayload(runtime) : null;

    res.json({
      session: {
        id: session.id,
        quizId: session.quiz_id,
        roomCode: session.room_code,
        status: session.status,
        quizTitle: session.title,
        quizCategory: session.category,
        quizRules: session.rules,
        currentQuestionIndex: session.current_question_index,
      },
      currentQuestion,
      leaderboard,
    });
  });

  router.get('/api/sessions/:roomCode/leaderboard', auth, async (req, res) => {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const db = getDb();

    const session = await db.get(
      `
        SELECT id, organizer_id
        FROM quiz_sessions
        WHERE room_code = ?
      `,
      [roomCode],
    );

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена.' });
    }

    if (req.user.role === 'organizer' && req.user.id !== session.organizer_id) {
      return res.status(403).json({ error: 'Нет доступа к этой сессии.' });
    }

    if (req.user.role === 'participant') {
      const member = await db.get('SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?', [
        session.id,
        req.user.id,
      ]);
      if (!member) {
        return res.status(403).json({ error: 'Нет доступа к этой сессии.' });
      }
    }

    const leaderboard = await getLeaderboard(session.id);
    res.json({ leaderboard });
  });

  return router;
}

module.exports = {
  createSessionsRouter,
};
