export default function SessionControlCard({ onStartQuiz, onNextQuestion, onFinishQuiz }) {
  return (
    <section className="card">
      <h2>Управление сессией</h2>
      <div className="row-actions">
        <button type="button" className="button" onClick={onStartQuiz}>
          Начать квиз
        </button>
        <button type="button" className="button button-outline" onClick={() => onNextQuestion(false)}>
          Следующий вопрос
        </button>
        <button type="button" className="button button-outline" onClick={() => onNextQuestion(true)}>
          Завершить вопрос и дальше
        </button>
        <button type="button" className="button button-danger" onClick={onFinishQuiz}>
          Завершить квиз
        </button>
      </div>
    </section>
  );
}
