const { Server } = require('socket.io');
const { getDb } = require('../db');
const { isOriginAllowed } = require('../config');
const { resolveUserFromToken } = require('../middleware/auth');
const {
  getLeaderboard,
  ensureRuntime,
  getCurrentQuestionPayload,
  closeQuestion,
  finishSession,
  showQuestion,
  startSession,
} = require('../runtime/session-runtime');
const { sortNumeric, arraysEqual, getRoomChannel } = require('../utils/session-utils');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('CORS origin denied'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const roomConnections = new Map();

  const addConnection = (roomCode, socketId, user) => {
    const roomMap = roomConnections.get(roomCode) || new Map();
    roomMap.set(socketId, {
      userId: user.id,
      name: user.name,
      role: user.role,
    });
    roomConnections.set(roomCode, roomMap);
  };

  const removeConnection = (roomCode, socketId) => {
    const roomMap = roomConnections.get(roomCode);
    if (!roomMap) return;
    roomMap.delete(socketId);
    if (roomMap.size === 0) {
      roomConnections.delete(roomCode);
    } else {
      roomConnections.set(roomCode, roomMap);
    }
  };

  const getConnectedParticipants = (roomCode) => {
    const roomMap = roomConnections.get(roomCode);
    if (!roomMap) return [];

    const byUserId = new Map();
    roomMap.forEach((item) => {
      if (item.role === 'participant' && !byUserId.has(item.userId)) {
        byUserId.set(item.userId, { userId: item.userId, name: item.name });
      }
    });
    return Array.from(byUserId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  };

  const emitParticipantsUpdate = (roomCode) => {
    io.to(getRoomChannel(roomCode)).emit('participants:update', {
      participants: getConnectedParticipants(roomCode),
    });
  };

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Требуется токен.'));
      }

      socket.data.user = await resolveUserFromToken(token);
      next();
    } catch (error) {
      next(new Error('Ошибка авторизации сокета.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ roomCode }) => {
      try {
        const db = getDb();
        const normalizedCode = String(roomCode || '').trim().toUpperCase();
        if (!normalizedCode) {
          socket.emit('error:event', { message: 'Код комнаты не передан.' });
          return;
        }

        const session = await db.get(
          `
            SELECT qs.id, qs.quiz_id, qs.organizer_id, qs.room_code, qs.status, q.title, q.category, q.rules
            FROM quiz_sessions qs
            INNER JOIN quizzes q ON q.id = qs.quiz_id
            WHERE qs.room_code = ?
          `,
          [normalizedCode],
        );

        if (!session) {
          socket.emit('error:event', { message: 'Комната не найдена.' });
          return;
        }

        if (socket.data.roomCode && socket.data.roomCode !== normalizedCode) {
          removeConnection(socket.data.roomCode, socket.id);
          emitParticipantsUpdate(socket.data.roomCode);
        }

        socket.join(getRoomChannel(normalizedCode));
        socket.data.roomCode = normalizedCode;
        addConnection(normalizedCode, socket.id, socket.data.user);

        if (socket.data.user.role === 'participant') {
          await db.run(
            `
              INSERT OR IGNORE INTO session_participants (session_id, user_id)
              VALUES (?, ?)
            `,
            [session.id, socket.data.user.id],
          );
        }

        const runtime = await ensureRuntime(normalizedCode);
        const leaderboard = await getLeaderboard(session.id);

        socket.emit('room:joined', {
          roomCode: normalizedCode,
          sessionStatus: session.status,
          quizTitle: session.title,
          quizCategory: session.category,
          quizRules: session.rules,
          leaderboard,
          connectedParticipants: getConnectedParticipants(normalizedCode),
        });
        emitParticipantsUpdate(normalizedCode);

        const currentQuestion = getCurrentQuestionPayload(runtime);
        if (currentQuestion) {
          socket.emit('question:show', currentQuestion);
        }
      } catch (error) {
        console.error(error);
        socket.emit('error:event', { message: 'Не удалось подключиться к комнате.' });
      }
    });

    socket.on('quiz:start', async ({ roomCode }) => {
      try {
        const normalizedCode = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
        const user = socket.data.user;
        const db = getDb();

        const session = await db.get(
          `
            SELECT id, organizer_id
            FROM quiz_sessions
            WHERE room_code = ?
          `,
          [normalizedCode],
        );

        if (!session) {
          socket.emit('error:event', { message: 'Сессия не найдена.' });
          return;
        }

        if (user.role !== 'organizer' || session.organizer_id !== user.id) {
          socket.emit('error:event', { message: 'Запустить квиз может только организатор.' });
          return;
        }

        const runtime = await ensureRuntime(normalizedCode);
        await startSession(io, runtime);
      } catch (error) {
        socket.emit('error:event', { message: error.message || 'Ошибка запуска квиза.' });
      }
    });

    socket.on('quiz:next-question', async ({ roomCode, forceClose }) => {
      try {
        const normalizedCode = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
        const user = socket.data.user;
        const db = getDb();

        const session = await db.get('SELECT id, organizer_id FROM quiz_sessions WHERE room_code = ?', [
          normalizedCode,
        ]);

        if (!session) {
          socket.emit('error:event', { message: 'Сессия не найдена.' });
          return;
        }

        if (user.role !== 'organizer' || session.organizer_id !== user.id) {
          socket.emit('error:event', { message: 'Управление доступно только организатору.' });
          return;
        }

        const runtime = await ensureRuntime(normalizedCode);

        if (runtime.status !== 'active') {
          socket.emit('error:event', { message: 'Квиз не запущен.' });
          return;
        }

        if (runtime.currentQuestionEndsAt && runtime.currentQuestionEndsAt > Date.now() && !forceClose) {
          socket.emit('error:event', {
            message: 'Текущий вопрос еще открыт. Передайте forceClose: true для досрочного завершения.',
          });
          return;
        }

        if (runtime.currentQuestionEndsAt && runtime.currentQuestionEndsAt > Date.now() && forceClose) {
          await closeQuestion(io, runtime);
        }

        await showQuestion(io, runtime, runtime.currentQuestionIndex + 1);
      } catch (error) {
        socket.emit('error:event', { message: error.message || 'Ошибка перехода к следующему вопросу.' });
      }
    });

    socket.on('question:answer', async ({ roomCode, questionId, optionIds }) => {
      try {
        const normalizedCode = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
        const user = socket.data.user;

        if (user.role !== 'participant') {
          socket.emit('error:event', { message: 'Отвечать может только участник.' });
          return;
        }

        const runtime = await ensureRuntime(normalizedCode);
        if (!runtime || runtime.status !== 'active') {
          socket.emit('error:event', { message: 'Сессия неактивна.' });
          return;
        }

        if (!runtime.currentQuestionEndsAt || runtime.currentQuestionEndsAt <= Date.now()) {
          socket.emit('error:event', { message: 'Время ответа истекло.' });
          return;
        }

        const currentQuestion = runtime.questions[runtime.currentQuestionIndex];
        if (!currentQuestion || Number(questionId) !== currentQuestion.id) {
          socket.emit('error:event', { message: 'Этот вопрос уже неактуален.' });
          return;
        }

        const selected = Array.isArray(optionIds)
          ? optionIds.map((value) => Number(value)).filter((value) => Number.isInteger(value))
          : [];

        if (selected.length === 0) {
          socket.emit('error:event', { message: 'Выберите хотя бы один вариант.' });
          return;
        }

        const validOptionIds = currentQuestion.options.map((option) => option.id);
        const everyOptionValid = selected.every((id) => validOptionIds.includes(id));
        if (!everyOptionValid) {
          socket.emit('error:event', { message: 'Обнаружен некорректный вариант ответа.' });
          return;
        }

        const db = getDb();
        await db.run(
          `
            INSERT OR IGNORE INTO session_participants (session_id, user_id)
            VALUES (?, ?)
          `,
          [runtime.sessionId, user.id],
        );

        const existingAnswer = await db.get(
          `
            SELECT id
            FROM answers
            WHERE session_id = ? AND user_id = ? AND question_id = ?
          `,
          [runtime.sessionId, user.id, currentQuestion.id],
        );

        if (existingAnswer) {
          socket.emit('error:event', { message: 'Ответ на этот вопрос уже отправлен.' });
          return;
        }

        const correctIds = sortNumeric(
          currentQuestion.options.filter((option) => option.is_correct === 1).map((option) => option.id),
        );
        const selectedSorted = sortNumeric([...new Set(selected)]);

        const isCorrect = arraysEqual(correctIds, selectedSorted);
        const scoreAwarded = isCorrect ? currentQuestion.points : 0;
        const timeLimitMs = currentQuestion.effective_time_limit * 1000;
        const questionStartedAt = runtime.currentQuestionEndsAt - timeLimitMs;
        const responseTimeMs = Math.max(0, Math.min(Date.now() - questionStartedAt, timeLimitMs));

        await db.run(
          `
            INSERT INTO answers (
              session_id, user_id, question_id, selected_option_ids, is_correct, score_awarded, response_time_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            runtime.sessionId,
            user.id,
            currentQuestion.id,
            JSON.stringify(selectedSorted),
            isCorrect ? 1 : 0,
            scoreAwarded,
            responseTimeMs,
          ],
        );

        if (scoreAwarded > 0) {
          await db.run(
            `
              UPDATE session_participants
              SET total_score = total_score + ?
              WHERE session_id = ? AND user_id = ?
            `,
            [scoreAwarded, runtime.sessionId, user.id],
          );
        }

        socket.emit('answer:accepted', {
          questionId: currentQuestion.id,
          acceptedAt: Date.now(),
        });

        const leaderboard = await getLeaderboard(runtime.sessionId);
        io.to(getRoomChannel(runtime.roomCode)).emit('leaderboard:update', { leaderboard });
      } catch (error) {
        socket.emit('error:event', { message: error.message || 'Ошибка отправки ответа.' });
      }
    });

    socket.on('quiz:finish', async ({ roomCode }) => {
      try {
        const normalizedCode = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
        const user = socket.data.user;
        const db = getDb();

        const session = await db.get('SELECT id, organizer_id FROM quiz_sessions WHERE room_code = ?', [
          normalizedCode,
        ]);

        if (!session) {
          socket.emit('error:event', { message: 'Сессия не найдена.' });
          return;
        }

        if (user.role !== 'organizer' || session.organizer_id !== user.id) {
          socket.emit('error:event', { message: 'Завершить квиз может только организатор.' });
          return;
        }

        const runtime = await ensureRuntime(normalizedCode);
        await finishSession(io, runtime);
      } catch (error) {
        socket.emit('error:event', { message: error.message || 'Ошибка завершения квиза.' });
      }
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      removeConnection(roomCode, socket.id);
      emitParticipantsUpdate(roomCode);
    });
  });
}

module.exports = {
  setupSocket,
};
