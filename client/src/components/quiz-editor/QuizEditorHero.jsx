export default function QuizEditorHero({ quiz }) {
  return (
    <section className="hero-panel">
      <h1>{quiz.title}</h1>
      <p>Категория: {quiz.category}</p>
      <p>Правила: {quiz.rules}</p>
      <p>Стандартное время на вопрос: {quiz.timePerQuestion} сек</p>
    </section>
  );
}
