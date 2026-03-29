import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format-utils';

export default function QuizCard({ quiz, busyAction, onStartSession, onDeleteQuiz }) {
  return (
    <article className="quiz-card">
      <div className="quiz-card-head">
        <h3>{quiz.title}</h3>
        <span className="quiz-category">{quiz.category}</span>
      </div>

      <div className="quiz-stats">
        <div className="quiz-stat-box">
          <span>Вопросы</span>
          <strong>{quiz.questions_count}</strong>
        </div>
        <div className="quiz-stat-box">
          <span>Сессии</span>
          <strong>{quiz.sessions_count}</strong>
        </div>
        <div className="quiz-stat-box">
          <span>Создан</span>
          <strong>{formatDate(quiz.created_at)}</strong>
        </div>
      </div>

      <div className="row-actions">
        <Link className="button button-small button-outline" to={`/quiz/${quiz.id}/edit`}>
          Редактировать
        </Link>
        <button
          type="button"
          className="button button-small"
          onClick={() => onStartSession(quiz.id)}
          disabled={busyAction === `start-${quiz.id}`}
        >
          {busyAction === `start-${quiz.id}` ? 'Запуск...' : 'Запустить'}
        </button>
        <button
          type="button"
          className="button button-small button-danger"
          onClick={() => onDeleteQuiz(quiz)}
          disabled={busyAction === `delete-${quiz.id}`}
        >
          {busyAction === `delete-${quiz.id}` ? 'Удаляем...' : 'Удалить'}
        </button>
      </div>
    </article>
  );
}
