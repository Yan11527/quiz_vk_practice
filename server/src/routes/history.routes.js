const { Router } = require('express');
const { getDb } = require('../db');

function createHistoryRouter({ auth }) {
  const router = Router();

  router.get('/api/history/me', auth, async (req, res) => {
    const db = getDb();

    if (req.user.role === 'participant') {
      const participationHistory = await db.all(
        `
          SELECT qs.id AS session_id, qs.room_code, q.title AS quiz_title, sp.total_score,
                 qs.created_at,
                 (
                   SELECT COUNT(*) + 1
                   FROM session_participants sp2
                   WHERE sp2.session_id = sp.session_id
                     AND sp2.total_score > sp.total_score
                 ) AS rank
          FROM session_participants sp
          INNER JOIN quiz_sessions qs ON qs.id = sp.session_id
          INNER JOIN quizzes q ON q.id = qs.quiz_id
          WHERE sp.user_id = ?
          ORDER BY qs.created_at DESC
        `,
        [req.user.id],
      );

      return res.json({
        role: 'participant',
        history: participationHistory,
      });
    }

    const organizerHistory = await db.all(
      `
        SELECT qs.id AS session_id, qs.room_code, qs.status, q.title AS quiz_title,
               qs.created_at, qs.started_at, qs.finished_at,
               (SELECT COUNT(*) FROM session_participants sp WHERE sp.session_id = qs.id) AS participants_count
        FROM quiz_sessions qs
        INNER JOIN quizzes q ON q.id = qs.quiz_id
        WHERE qs.organizer_id = ?
        ORDER BY qs.created_at DESC
      `,
      [req.user.id],
    );

    return res.json({
      role: 'organizer',
      history: organizerHistory,
    });
  });

  return router;
}

module.exports = {
  createHistoryRouter,
};
