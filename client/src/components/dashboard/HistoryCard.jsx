import { formatDate } from '../../lib/format-utils';
import { getSessionStatusMeta } from '../../lib/status-utils';

export default function HistoryCard({ item, isOrganizer, onOpen }) {
  const statusMeta = getSessionStatusMeta(item.status);

  return (
    <button type="button" className="history-card" onClick={() => onOpen(item)}>
      <div className="row-between">
        <h3>{item.quiz_title}</h3>
        <span className="history-room">{item.room_code}</span>
      </div>
      <p className="muted">Нажмите, чтобы открыть лидерборд</p>
      {isOrganizer ? (
        <div className="history-meta">
          <span className="status-line">
            <span>Статус:</span>
            <span className={`status-pill ${statusMeta.tone}`}>{statusMeta.label}</span>
          </span>
          <span>Участники: {item.participants_count}</span>
          <span>Создан: {formatDate(item.created_at)}</span>
          <span>Завершен: {formatDate(item.finished_at)}</span>
        </div>
      ) : (
        <div className="history-meta">
          <span>Баллы: {item.total_score}</span>
          <span>Место: {item.rank}</span>
          <span>Дата: {formatDate(item.created_at)}</span>
        </div>
      )}
    </button>
  );
}
