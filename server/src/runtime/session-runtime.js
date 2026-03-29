const { getDb, getQuizQuestions } = require('../db');
const { getRoomChannel, toPublicQuestion } = require('../utils/session-utils');

const activeSessions = new Map();

async function getLeaderboard(sessionId) {
  const db = getDb();
  return db.all(
    `
      SELECT
        u.id AS user_id,
        u.name,
        sp.total_score,
        COALESCE(SUM(a.response_time_ms), 2147483647) AS total_response_time_ms,
        COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN a.response_time_ms ELSE 0 END), 2147483647) AS total_correct_response_time_ms,
        COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers_count
      FROM session_participants sp
      INNER JOIN users u ON u.id = sp.user_id
      LEFT JOIN answers a ON a.session_id = sp.session_id AND a.user_id = sp.user_id
      WHERE sp.session_id = ?
      GROUP BY u.id, u.name, sp.total_score
      ORDER BY
        sp.total_score DESC,
        CASE
          WHEN COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END), 0) > 0 THEN 0
          ELSE 1
        END ASC,
        COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN a.response_time_ms ELSE 0 END), 2147483647) ASC,
        COALESCE(SUM(a.response_time_ms), 2147483647) ASC,
        u.name ASC
    `,
    [sessionId],
  );
}

async function loadSessionRuntime(roomCode) {
  const db = getDb();

  const session = await db.get(
    `
      SELECT qs.id, qs.quiz_id, qs.organizer_id, qs.room_code, qs.status, qs.current_question_index,
             q.time_per_question
      FROM quiz_sessions qs
      INNER JOIN quizzes q ON q.id = qs.quiz_id
      WHERE qs.room_code = ?
    `,
    [roomCode],
  );

  if (!session) {
    return null;
  }

  const questions = await getQuizQuestions(session.quiz_id, true);
  const normalizedQuestions = questions.map((question) => ({
    ...question,
    effective_time_limit: question.time_limit_seconds || session.time_per_question,
  }));

  const runtime = {
    sessionId: session.id,
    roomCode: session.room_code,
    quizId: session.quiz_id,
    organizerId: session.organizer_id,
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    currentQuestionEndsAt: null,
    timer: null,
    questions: normalizedQuestions,
  };

  activeSessions.set(roomCode, runtime);
  return runtime;
}

async function ensureRuntime(roomCode) {
  const existing = activeSessions.get(roomCode);
  if (existing) {
    return existing;
  }

  return loadSessionRuntime(roomCode);
}

function getCurrentQuestionPayload(runtime) {
  if (!runtime || runtime.currentQuestionIndex < 0 || runtime.currentQuestionEndsAt <= Date.now()) {
    return null;
  }

  const rawQuestion = runtime.questions[runtime.currentQuestionIndex];
  const remainingSeconds = Math.ceil((runtime.currentQuestionEndsAt - Date.now()) / 1000);
  return {
    question: toPublicQuestion(rawQuestion, remainingSeconds),
    endsAt: runtime.currentQuestionEndsAt,
    index: runtime.currentQuestionIndex,
    total: runtime.questions.length,
  };
}

async function closeQuestion(io, runtime) {
  if (runtime.currentQuestionIndex < 0) {
    return;
  }

  runtime.currentQuestionEndsAt = null;
  if (runtime.timer) {
    clearTimeout(runtime.timer);
    runtime.timer = null;
  }

  const currentQuestion = runtime.questions[runtime.currentQuestionIndex];
  io.to(getRoomChannel(runtime.roomCode)).emit('question:closed', {
    questionId: currentQuestion.id,
  });

  const leaderboard = await getLeaderboard(runtime.sessionId);
  io.to(getRoomChannel(runtime.roomCode)).emit('leaderboard:update', { leaderboard });
}

async function finishSession(io, runtime) {
  const db = getDb();

  runtime.status = 'finished';
  runtime.currentQuestionEndsAt = null;
  if (runtime.timer) {
    clearTimeout(runtime.timer);
    runtime.timer = null;
  }

  await db.run(
    `
      UPDATE quiz_sessions
      SET status = 'finished', finished_at = datetime('now')
      WHERE id = ?
    `,
    [runtime.sessionId],
  );

  const leaderboard = await getLeaderboard(runtime.sessionId);

  io.to(getRoomChannel(runtime.roomCode)).emit('quiz:finished', {
    sessionId: runtime.sessionId,
    leaderboard,
    winner: leaderboard[0] || null,
  });

  activeSessions.delete(runtime.roomCode);
}

async function showQuestion(io, runtime, nextIndex) {
  const db = getDb();

  if (nextIndex >= runtime.questions.length) {
    await finishSession(io, runtime);
    return;
  }

  const question = runtime.questions[nextIndex];
  runtime.currentQuestionIndex = nextIndex;

  await db.run(
    `
      UPDATE quiz_sessions
      SET current_question_index = ?
      WHERE id = ?
    `,
    [nextIndex, runtime.sessionId],
  );

  const endsAt = Date.now() + question.effective_time_limit * 1000;
  runtime.currentQuestionEndsAt = endsAt;
  if (runtime.timer) {
    clearTimeout(runtime.timer);
  }

  runtime.timer = setTimeout(async () => {
    try {
      await closeQuestion(io, runtime);
    } catch (error) {
      console.error('Failed to close question by timer', error);
    }
  }, question.effective_time_limit * 1000);

  io.to(getRoomChannel(runtime.roomCode)).emit('question:show', {
    question: toPublicQuestion(question, question.effective_time_limit),
    endsAt,
    index: nextIndex,
    total: runtime.questions.length,
  });
}

async function startSession(io, runtime) {
  const db = getDb();

  if (runtime.status === 'finished') {
    throw new Error('Сессия уже завершена.');
  }

  if (runtime.status === 'waiting') {
    runtime.status = 'active';
    await db.run(
      `
        UPDATE quiz_sessions
        SET status = 'active', started_at = datetime('now')
        WHERE id = ?
      `,
      [runtime.sessionId],
    );
  }

  io.to(getRoomChannel(runtime.roomCode)).emit('quiz:started', {
    sessionId: runtime.sessionId,
    totalQuestions: runtime.questions.length,
  });

  if (runtime.currentQuestionIndex < 0) {
    await showQuestion(io, runtime, 0);
    return;
  }

  const currentQuestion = getCurrentQuestionPayload(runtime);
  if (currentQuestion) {
    io.to(getRoomChannel(runtime.roomCode)).emit('question:show', currentQuestion);
  }
}

function clearQuizRuntimes(quizId) {
  for (const [roomCode, runtime] of activeSessions.entries()) {
    if (runtime.quizId === quizId) {
      if (runtime.timer) {
        clearTimeout(runtime.timer);
      }
      activeSessions.delete(roomCode);
    }
  }
}

module.exports = {
  getLeaderboard,
  ensureRuntime,
  getCurrentQuestionPayload,
  closeQuestion,
  finishSession,
  showQuestion,
  startSession,
  clearQuizRuntimes,
};
