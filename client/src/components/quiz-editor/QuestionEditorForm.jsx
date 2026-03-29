export default function QuestionEditorForm({
  editorSectionRef,
  editingQuestionId,
  form,
  imageInputKey,
  imagePreviewUrl,
  saving,
  onSubmit,
  onCancel,
  onPromptChange,
  onQuestionTypeChange,
  onImageSelected,
  onAnswerModeChange,
  onPointsChange,
  onTimeLimitChange,
  onOptionTextChange,
  onOptionCorrectChange,
  onRemoveOption,
  onAddOption,
}) {
  return (
    <section className="card" ref={editorSectionRef}>
      <div className="row-between">
        <h2>{editingQuestionId ? 'Редактировать вопрос' : 'Добавить вопрос'}</h2>
        {editingQuestionId && (
          <button type="button" className="button button-small button-outline" onClick={onCancel}>
            Отменить
          </button>
        )}
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Формулировка вопроса
          <textarea required minLength={3} value={form.prompt} onChange={onPromptChange} />
        </label>

        <label>
          Тип вопроса
          <select value={form.questionType} onChange={onQuestionTypeChange}>
            <option value="text">Текстовый</option>
            <option value="image">С изображением</option>
          </select>
        </label>

        {form.questionType === 'image' && (
          <label>
            Изображение вопроса
            <input key={imageInputKey} type="file" accept="image/*" onChange={onImageSelected} />
          </label>
        )}

        {form.questionType === 'image' && imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="question preview" className="question-image-preview" />
        )}

        <label>
          Режим ответов
          <select value={form.answerMode} onChange={onAnswerModeChange}>
            <option value="single">Одиночный выбор</option>
            <option value="multiple">Множественный выбор</option>
          </select>
        </label>

        <div className="form-columns">
          <label>
            Баллы
            <input type="number" min={1} max={100} value={form.points} onChange={onPointsChange} />
          </label>

          <label>
            Время на вопрос (сек, опционально)
            <input type="number" min={5} max={180} value={form.timeLimitSeconds} onChange={onTimeLimitChange} />
          </label>
        </div>

        <div className="options-grid">
          <p>Варианты ответов</p>
          {form.options.map((option, index) => (
            <div className="option-row" key={`option-${index + 1}`}>
              <input
                type="text"
                placeholder={`Вариант ${index + 1}`}
                value={option.text}
                onChange={(event) => onOptionTextChange(index, event.target.value)}
              />
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(event) => onOptionCorrectChange(index, event.target.checked)}
                />
                Верный
              </label>
              <button type="button" className="button button-small button-danger" onClick={() => onRemoveOption(index)}>
                Удалить
              </button>
            </div>
          ))}
          <button type="button" className="button button-small button-outline" onClick={onAddOption}>
            Добавить вариант
          </button>
        </div>

        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Сохраняем вопрос...' : editingQuestionId ? 'Обновить вопрос' : 'Сохранить вопрос'}
        </button>
      </form>
    </section>
  );
}
