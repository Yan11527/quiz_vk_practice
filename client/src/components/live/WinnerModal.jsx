import { getScoreWord } from '../../lib/format-utils';

const BURSTS = [
  { id: 'top-left', x: '10%', y: '0%', delay: '0s' },
  { id: 'top-center', x: '50%', y: '-4%', delay: '0.15s' },
  { id: 'top-right', x: '90%', y: '0%', delay: '0.3s' },
  { id: 'right-mid', x: '102%', y: '50%', delay: '0.45s' },
  { id: 'bottom-right', x: '90%', y: '100%', delay: '0.6s' },
  { id: 'bottom-center', x: '50%', y: '104%', delay: '0.75s' },
  { id: 'bottom-left', x: '10%', y: '100%', delay: '0.9s' },
  { id: 'left-mid', x: '-2%', y: '50%', delay: '1.05s' },
];

export default function WinnerModal({ open, winner, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="winner-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-modal-title"
      onClick={onClose}
    >
      <section className="winner-modal" onClick={(event) => event.stopPropagation()}>
        <div className="winner-fireworks" aria-hidden="true">
          {BURSTS.map((burst) => (
            <div
              key={burst.id}
              className="winner-burst"
              style={{
                '--burst-x': burst.x,
                '--burst-y': burst.y,
                '--burst-delay': burst.delay,
              }}
            >
              {Array.from({ length: 14 }).map((_, index) => (
                <span key={`${burst.id}-spark-${index}`} style={{ '--i': index }} />
              ))}
            </div>
          ))}
        </div>

        <h2 id="winner-modal-title">Квиз завершен!</h2>
        <p className="winner-text">
          {winner ? (
            <>
              Победитель: <strong>{winner.name}</strong>
            </>
          ) : (
            'Квиз завершен. Результаты сохранены.'
          )}
        </p>
        {winner && (
          <p className="winner-score">
            Счет победителя: {winner.totalScore} {getScoreWord(winner.totalScore)}
          </p>
        )}
        <button type="button" className="button" onClick={onClose}>
          Отлично
        </button>
      </section>
    </div>
  );
}
