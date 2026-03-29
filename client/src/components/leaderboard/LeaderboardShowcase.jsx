import { getScoreWord } from '../../lib/format-utils';

export default function LeaderboardShowcase({ leaderboard, emptyText = 'Нет данных по итоговым баллам.' }) {
  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="leaderboard-showcase">
      <div className="leaderboard-podium">
        {leaderboard.slice(0, 3).map((entry, index) => (
          <article key={`${entry.user_id}-top-${index + 1}`} className={`podium-card podium-place-${index + 1}`}>
            <div className="podium-main-row">
              <div className="podium-left">
                <div className="podium-rank">{index + 1} место</div>
                <h3>{entry.name}</h3>
              </div>
              <div className="podium-score">
                {entry.total_score} {getScoreWord(entry.total_score)}
              </div>
            </div>
          </article>
        ))}
      </div>

      {leaderboard.length > 3 && (
        <div className="leaderboard-rest">
          {leaderboard.slice(3).map((entry, offset) => {
            const rank = offset + 4;
            return (
              <div className="leaderboard-rest-row" key={`${entry.user_id}-rest-${rank}`}>
                <span className="rest-rank">{rank}</span>
                <span className="rest-name">{entry.name}</span>
                <span className="rest-score">
                  {entry.total_score} {getScoreWord(entry.total_score)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
