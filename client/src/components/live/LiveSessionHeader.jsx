import { Link } from 'react-router-dom';

export default function LiveSessionHeader({ roomCode, session, statusMeta }) {
  return (
    <section className="hero-panel live-header">
      <div>
        <h1>Комната {roomCode}</h1>
        <p>{session?.quizTitle || 'Загрузка названия квиза...'}</p>
        <p>Категория: {session?.quizCategory || '—'}</p>
        <p>Правила: {session?.quizRules || '—'}</p>
        <div className="live-status-row">
          <span className="live-status-label">Статус:</span>
          <span className={`status-pill ${statusMeta.tone}`}>{statusMeta.label}</span>
        </div>
      </div>
      <div className="row-actions">
        <Link to="/dashboard" className="button button-outline">
          В кабинет
        </Link>
      </div>
    </section>
  );
}
