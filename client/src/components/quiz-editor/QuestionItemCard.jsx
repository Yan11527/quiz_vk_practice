export default function QuestionItemCard({
  question,
  canEdit,
  deletingQuestionId,
  defaultTimePerQuestion,
  onEdit,
  onDelete,
}) {
  return (
    <article className="question-item">
      <div className="row-between">
        <h3>
          #{question.position}. {question.prompt}
        </h3>
        {canEdit && (
          <div className="row-actions">
            <button type="button" className="button button-small button-outline" onClick={() => onEdit(question)}>
              Редактировать
            </button>
            <button
              type="button"
              className="button button-small button-danger"
              onClick={() => onDelete(question)}
              disabled={deletingQuestionId === question.id}
            >
              {deletingQuestionId === question.id ? 'Удаляем...' : 'Удалить'}
            </button>
          </div>
        )}
      </div>
      <p className="muted">
        Тип: {question.question_type === 'image' ? 'Изображение' : 'Текст'} | Режим ответа:{' '}
        {question.answer_mode === 'single' ? 'Один ответ' : 'Несколько ответов'} | Баллы: {question.points} |
        Время: {question.time_limit_seconds || defaultTimePerQuestion} сек.
      </p>
      {question.image_url && <img src={question.image_url} alt="question" className="question-image-preview" />}
      <ul className="answers-list">
        {question.options.map((option) => (
          <li key={option.id} className={option.is_correct ? 'correct-option' : ''}>
            {option.text}
          </li>
        ))}
      </ul>
    </article>
  );
}
