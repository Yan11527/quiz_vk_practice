const { Router } = require('express');
const { getDb, getQuizQuestions } = require('../db');
const { requireRole } = require('../middleware/auth');
const { clearQuizRuntimes } = require('../runtime/session-runtime');
const { schemas } = require('../validation/schemas');
const { validateBody } = require('../validation/validate-body');

function mapQuizResponse(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    category: quiz.category,
    rules: quiz.rules,
    timePerQuestion: quiz.time_per_question,
    createdAt: quiz.created_at,
  };
}

function createQuizzesRouter({ auth }) {
  const router = Router();

  router.post('/api/quizzes', auth, requireRole('organizer'), async (req, res) => {
    const input = validateBody(schemas.createQuiz, req.body, res);
    if (!input) return;

    const db = getDb();
    const result = await db.run(
      `
        INSERT INTO quizzes (organizer_id, title, category, rules, time_per_question)
        VALUES (?, ?, ?, ?, ?)
      `,
      [req.user.id, input.title.trim(), input.category.trim(), input.rules.trim(), input.timePerQuestion],
    );

    const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [result.lastID]);

    res.status(201).json({
      quiz: mapQuizResponse(quiz),
    });
  });

  router.get('/api/quizzes/mine', auth, requireRole('organizer'), async (req, res) => {
    const db = getDb();
    const quizzes = await db.all(
      `
        SELECT q.id, q.title, q.category, q.rules, q.time_per_question, q.created_at,
          (SELECT COUNT(*) FROM questions qu WHERE qu.quiz_id = q.id) AS questions_count,
          (SELECT COUNT(*) FROM quiz_sessions qs WHERE qs.quiz_id = q.id) AS sessions_count
        FROM quizzes q
        WHERE q.organizer_id = ?
        ORDER BY q.created_at DESC
      `,
      [req.user.id],
    );

    res.json({ quizzes });
  });

  router.get('/api/quizzes/:quizId', auth, async (req, res) => {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId)) {
      return res.status(400).json({ error: 'Некорректный id квиза.' });
    }

    const db = getDb();
    const quiz = await db.get(
      `
        SELECT q.id, q.organizer_id, q.title, q.category, q.rules, q.time_per_question, q.created_at,
               u.name AS organizer_name
        FROM quizzes q
        INNER JOIN users u ON u.id = q.organizer_id
        WHERE q.id = ?
      `,
      [quizId],
    );

    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    const canSeeAnswers = req.user.role === 'organizer' && req.user.id === quiz.organizer_id;
    const questions = await getQuizQuestions(quizId, canSeeAnswers);

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        rules: quiz.rules,
        timePerQuestion: quiz.time_per_question,
        organizerName: quiz.organizer_name,
        createdAt: quiz.created_at,
      },
      questions,
    });
  });

  router.put('/api/quizzes/:quizId', auth, requireRole('organizer'), async (req, res) => {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId)) {
      return res.status(400).json({ error: 'Некорректный id квиза.' });
    }

    const input = validateBody(schemas.createQuiz, req.body, res);
    if (!input) return;

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Редактировать может только автор квиза.' });
    }

    await db.run(
      `
        UPDATE quizzes
        SET title = ?, category = ?, rules = ?, time_per_question = ?
        WHERE id = ?
      `,
      [input.title.trim(), input.category.trim(), input.rules.trim(), input.timePerQuestion, quizId],
    );

    const updatedQuiz = await db.get(
      `
        SELECT id, title, category, rules, time_per_question, created_at
        FROM quizzes
        WHERE id = ?
      `,
      [quizId],
    );

    return res.json({
      quiz: mapQuizResponse(updatedQuiz),
    });
  });

  router.delete('/api/quizzes/:quizId', auth, requireRole('organizer'), async (req, res) => {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId)) {
      return res.status(400).json({ error: 'Некорректный id квиза.' });
    }

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Удалять может только автор квиза.' });
    }

    const activeSession = await db.get(
      `
        SELECT room_code
        FROM quiz_sessions
        WHERE quiz_id = ? AND status IN ('waiting', 'active')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [quizId],
    );

    if (activeSession) {
      return res.status(409).json({
        error: `Нельзя удалить квиз с активной сессией (${activeSession.room_code}). Сначала завершите сессию.`,
      });
    }

    clearQuizRuntimes(quizId);

    await db.run('DELETE FROM quizzes WHERE id = ?', [quizId]);
    return res.json({ ok: true });
  });

  router.post('/api/quizzes/:quizId/questions', auth, requireRole('organizer'), async (req, res) => {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId)) {
      return res.status(400).json({ error: 'Некорректный id квиза.' });
    }

    const input = validateBody(schemas.addQuestion, req.body, res);
    if (!input) return;

    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
      return res.status(400).json({ error: 'Нужен хотя бы один правильный вариант.' });
    }

    if (input.answerMode === 'single' && correctCount !== 1) {
      return res
        .status(400)
        .json({ error: 'Для одиночного выбора должен быть ровно один правильный вариант.' });
    }

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Редактировать может только автор квиза.' });
    }

    const lastPositionRow = await db.get(
      'SELECT COALESCE(MAX(position), 0) AS max_position FROM questions WHERE quiz_id = ?',
      [quizId],
    );
    const nextPosition = Number(lastPositionRow.max_position || 0) + 1;

    await db.exec('BEGIN TRANSACTION;');
    try {
      const questionInsert = await db.run(
        `
          INSERT INTO questions (
            quiz_id, position, prompt, question_type, image_url, answer_mode, points, time_limit_seconds
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          quizId,
          nextPosition,
          input.prompt.trim(),
          input.questionType,
          input.imageUrl || null,
          input.answerMode,
          input.points,
          input.timeLimitSeconds || null,
        ],
      );

      for (const option of input.options) {
        await db.run(
          `
            INSERT INTO question_options (question_id, text, image_url, is_correct)
            VALUES (?, ?, ?, ?)
          `,
          [questionInsert.lastID, option.text.trim(), option.imageUrl || null, option.isCorrect ? 1 : 0],
        );
      }

      await db.exec('COMMIT;');

      const [question] = await getQuizQuestions(quizId, true).then((questions) =>
        questions.filter((item) => item.id === questionInsert.lastID),
      );

      return res.status(201).json({ question });
    } catch (error) {
      await db.exec('ROLLBACK;');
      return res.status(500).json({ error: 'Не удалось добавить вопрос.' });
    }
  });

  router.put('/api/quizzes/:quizId/questions/:questionId', auth, requireRole('organizer'), async (req, res) => {
    const quizId = Number(req.params.quizId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(quizId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: 'Некорректный идентификатор квиза или вопроса.' });
    }

    const input = validateBody(schemas.addQuestion, req.body, res);
    if (!input) return;

    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
      return res.status(400).json({ error: 'Нужен хотя бы один правильный вариант.' });
    }

    if (input.answerMode === 'single' && correctCount !== 1) {
      return res
        .status(400)
        .json({ error: 'Для одиночного выбора должен быть ровно один правильный вариант.' });
    }

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Редактировать может только автор квиза.' });
    }

    const question = await db.get('SELECT id FROM questions WHERE id = ? AND quiz_id = ?', [questionId, quizId]);
    if (!question) {
      return res.status(404).json({ error: 'Вопрос не найден в этом квизе.' });
    }

    await db.exec('BEGIN TRANSACTION;');
    try {
      await db.run(
        `
          UPDATE questions
          SET prompt = ?, question_type = ?, image_url = ?, answer_mode = ?, points = ?, time_limit_seconds = ?
          WHERE id = ? AND quiz_id = ?
        `,
        [
          input.prompt.trim(),
          input.questionType,
          input.imageUrl || null,
          input.answerMode,
          input.points,
          input.timeLimitSeconds || null,
          questionId,
          quizId,
        ],
      );

      await db.run('DELETE FROM question_options WHERE question_id = ?', [questionId]);
      for (const option of input.options) {
        await db.run(
          `
            INSERT INTO question_options (question_id, text, image_url, is_correct)
            VALUES (?, ?, ?, ?)
          `,
          [questionId, option.text.trim(), option.imageUrl || null, option.isCorrect ? 1 : 0],
        );
      }

      await db.exec('COMMIT;');

      const [updatedQuestion] = await getQuizQuestions(quizId, true).then((questions) =>
        questions.filter((item) => item.id === questionId),
      );

      return res.json({ question: updatedQuestion });
    } catch (error) {
      await db.exec('ROLLBACK;');
      return res.status(500).json({ error: 'Не удалось обновить вопрос.' });
    }
  });

  router.delete('/api/quizzes/:quizId/questions/:questionId', auth, requireRole('organizer'), async (req, res) => {
    const quizId = Number(req.params.quizId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(quizId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: 'Некорректный идентификатор квиза или вопроса.' });
    }

    const db = getDb();
    const quiz = await db.get('SELECT id, organizer_id FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден.' });
    }

    if (quiz.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Удалять вопросы может только автор квиза.' });
    }

    const question = await db.get('SELECT id, position FROM questions WHERE id = ? AND quiz_id = ?', [
      questionId,
      quizId,
    ]);
    if (!question) {
      return res.status(404).json({ error: 'Вопрос не найден в этом квизе.' });
    }

    await db.exec('BEGIN TRANSACTION;');
    try {
      await db.run('DELETE FROM questions WHERE id = ? AND quiz_id = ?', [questionId, quizId]);
      await db.run(
        `
          UPDATE questions
          SET position = position - 1
          WHERE quiz_id = ? AND position > ?
        `,
        [quizId, question.position],
      );
      await db.exec('COMMIT;');
      return res.json({ ok: true });
    } catch (error) {
      await db.exec('ROLLBACK;');
      return res.status(500).json({ error: 'Не удалось удалить вопрос.' });
    }
  });

  return router;
}

module.exports = {
  createQuizzesRouter,
};
