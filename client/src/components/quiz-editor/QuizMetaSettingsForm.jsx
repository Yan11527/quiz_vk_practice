export default function QuizMetaSettingsForm({ quizMetaForm, setQuizMetaForm, savingQuizMeta, onSubmit, onReset }) {
  return (
    <section className="card">
      <div className="row-between">
        <h2>Параметры квиза</h2>
        <button type="button" className="button button-small button-outline" onClick={onReset}>
          Сбросить
        </button>
      </div>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Название
          <input
            type="text"
            required
            minLength={3}
            value={quizMetaForm.title}
            onChange={(event) => setQuizMetaForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>

        <label>
          Категория
          <input
            type="text"
            required
            minLength={2}
            value={quizMetaForm.category}
            onChange={(event) => setQuizMetaForm((prev) => ({ ...prev, category: event.target.value }))}
          />
        </label>

        <label>
          Время на вопрос (сек)
          <input
            type="number"
            min={5}
            max={180}
            required
            value={quizMetaForm.timePerQuestion}
            onChange={(event) =>
              setQuizMetaForm((prev) => ({
                ...prev,
                timePerQuestion: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Правила
          <textarea
            required
            minLength={3}
            value={quizMetaForm.rules}
            onChange={(event) => setQuizMetaForm((prev) => ({ ...prev, rules: event.target.value }))}
          />
        </label>

        <button type="submit" className="button" disabled={savingQuizMeta}>
          {savingQuizMeta ? 'Сохраняем параметры...' : 'Сохранить параметры квиза'}
        </button>
      </form>
    </section>
  );
}
