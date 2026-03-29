const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function initDatabase() {
  if (db) {
    return db;
  }

  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  db = await open({
    filename: path.join(dataDir, 'quiz.sqlite'),
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('participant', 'organizer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      rules TEXT NOT NULL,
      time_per_question INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK (question_type IN ('text', 'image')),
      image_url TEXT,
      answer_mode TEXT NOT NULL CHECK (answer_mode IN ('single', 'multiple')),
      points INTEGER NOT NULL DEFAULT 1,
      time_limit_seconds INTEGER,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      UNIQUE (quiz_id, position)
    );

    CREATE TABLE IF NOT EXISTS question_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      image_url TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      organizer_id INTEGER NOT NULL,
      room_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'finished')) DEFAULT 'waiting',
      current_question_index INTEGER NOT NULL DEFAULT -1,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      total_score INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option_ids TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      score_awarded INTEGER NOT NULL,
      response_time_ms INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE (session_id, user_id, question_id)
    );
  `);

  const answerColumns = await db.all(`PRAGMA table_info('answers')`);
  if (!answerColumns.some((column) => column.name === 'response_time_ms')) {
    await db.exec('ALTER TABLE answers ADD COLUMN response_time_ms INTEGER NOT NULL DEFAULT 0;');
  }

  return db;
}

async function getQuestionOptions(questionId, includeCorrect = false) {
  const columns = includeCorrect
    ? 'id, text, image_url, is_correct'
    : 'id, text, image_url';

  return db.all(
    `SELECT ${columns} FROM question_options WHERE question_id = ? ORDER BY id ASC`,
    [questionId],
  );
}

async function getQuizQuestions(quizId, includeCorrect = false) {
  const questions = await db.all(
    `
      SELECT id, quiz_id, position, prompt, question_type, image_url, answer_mode, points, time_limit_seconds
      FROM questions
      WHERE quiz_id = ?
      ORDER BY position ASC
    `,
    [quizId],
  );

  const withOptions = [];
  for (const question of questions) {
    const options = await getQuestionOptions(question.id, includeCorrect);
    withOptions.push({ ...question, options });
  }

  return withOptions;
}

module.exports = {
  initDatabase,
  getDb: () => db,
  getQuizQuestions,
};
