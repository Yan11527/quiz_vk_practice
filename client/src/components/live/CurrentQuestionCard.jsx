export default function CurrentQuestionCard({
  currentQuestion,
  questionPayload,
  timeLeft,
  finished,
  isOrganizer,
  selectedOptionIds,
  answerLocked,
  submitted,
  onToggleOption,
  onSubmitAnswer,
}) {
  return (
    <section className="card">
      <h2>Текущий вопрос</h2>
      {!currentQuestion ? (
        <p className="muted">
          {finished
            ? 'Квиз завершен. Посмотрите финальную таблицу ниже.'
            : 'Ожидаем начало квиза или следующий вопрос.'}
        </p>
      ) : (
        <div className="live-question">
          <div className="row-between">
            <p>
              Вопрос {questionPayload.index + 1} / {questionPayload.total}
            </p>
            <p>Осталось: {timeLeft} сек.</p>
          </div>
          <h3>{currentQuestion.prompt}</h3>
          {currentQuestion.imageUrl && (
            <img src={currentQuestion.imageUrl} alt="question" className="question-image-preview" />
          )}

          <div className="answers-grid">
            {currentQuestion.options.map((option) => {
              const selected = selectedOptionIds.includes(option.id);
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`answer-option ${selected ? 'selected' : ''}`}
                  onClick={() => onToggleOption(option.id)}
                  disabled={answerLocked}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {!isOrganizer && (
            <button
              type="button"
              className="button"
              disabled={answerLocked || selectedOptionIds.length === 0}
              onClick={onSubmitAnswer}
            >
              {submitted ? 'Ответ отправлен' : 'Отправить ответ'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
