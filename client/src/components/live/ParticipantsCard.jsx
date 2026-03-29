export default function ParticipantsCard({ participants }) {
  return (
    <section className="card">
      <h2>Подключенные участники</h2>
      {participants.length === 0 ? (
        <p className="muted">Пока никто не подключился. Отправьте участникам код комнаты.</p>
      ) : (
        <div className="participants-list">
          {participants.map((participant, index) => (
            <div className="participant-item" key={`${participant.userId}-${index + 1}`}>
              <span className="participant-index">{index + 1}</span>
              <span className="participant-name">{participant.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
