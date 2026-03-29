import LeaderboardShowcase from './LeaderboardShowcase';

export default function LeaderboardModal({
  open,
  title,
  loading,
  leaderboard,
  loadingText = 'Загружаем лидерборд...',
  emptyText = 'Нет данных по участникам.',
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <section className="leaderboard-modal" onClick={(event) => event.stopPropagation()}>
        <div className="row-between">
          <h2>{title}</h2>
          <button type="button" className="button button-small button-outline" onClick={onClose}>
            Закрыть
          </button>
        </div>

        {loading ? (
          <p className="muted">{loadingText}</p>
        ) : (
          <LeaderboardShowcase leaderboard={leaderboard} emptyText={emptyText} />
        )}
      </section>
    </div>
  );
}
