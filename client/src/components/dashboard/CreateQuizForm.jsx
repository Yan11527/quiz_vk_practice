export default function CreateQuizForm({ createForm, setCreateForm, busyAction, onSubmit }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Название
        <input
          type="text"
          required
          minLength={3}
          value={createForm.title}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
        />
      </label>

      <label>
        Категория
        <input
          type="text"
          required
          value={createForm.category}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
        />
      </label>

      <label>
        Время на вопрос (сек)
        <input
          type="number"
          min={5}
          max={180}
          required
          value={createForm.timePerQuestion}
          onChange={(event) =>
            setCreateForm((prev) => ({
              ...prev,
              timePerQuestion: Number(event.target.value),
            }))
          }
        />
      </label>

      <label>
        Правила
        <textarea
          required
          minLength={3}
          value={createForm.rules}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, rules: event.target.value }))}
        />
      </label>

      <button type="submit" className="button" disabled={busyAction === 'create'}>
        {busyAction === 'create' ? 'Сохраняем...' : 'Создать квиз'}
      </button>
    </form>
  );
}
