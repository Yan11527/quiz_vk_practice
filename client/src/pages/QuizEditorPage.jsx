import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QuestionEditorForm from '../components/quiz-editor/QuestionEditorForm';
import QuestionItemCard from '../components/quiz-editor/QuestionItemCard';
import QuizEditorHero from '../components/quiz-editor/QuizEditorHero';
import QuizMetaSettingsForm from '../components/quiz-editor/QuizMetaSettingsForm';
import { useAuth } from '../auth-context';
import { api } from '../lib/api';
import { extractApiError } from '../lib/error-utils';
import { useToast } from '../toast-context';

function buildInitialForm() {
  return {
    prompt: '',
    questionType: 'text',
    imageUrl: '',
    answerMode: 'single',
    points: 1,
    timeLimitSeconds: '',
    options: [
      { text: '', imageUrl: '', isCorrect: true },
      { text: '', imageUrl: '', isCorrect: false },
    ],
  };
}

function buildQuizMetaForm(quiz) {
  return {
    title: quiz?.title || '',
    category: quiz?.category || '',
    rules: quiz?.rules || '',
    timePerQuestion: String(quiz?.timePerQuestion ?? 20),
  };
}

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingQuizMeta, setSavingQuizMeta] = useState(false);
  const [quizMetaForm, setQuizMetaForm] = useState(buildQuizMetaForm);
  const [form, setForm] = useState(buildInitialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageInputKey, setImageInputKey] = useState(0);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const editorSectionRef = useRef(null);

  const canEdit = useMemo(() => user.role === 'organizer', [user.role]);

  const revokePreviewIfNeeded = (url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const resetEditorForm = () => {
    setForm(buildInitialForm());
    setImageFile(null);
    revokePreviewIfNeeded(imagePreviewUrl);
    setImagePreviewUrl('');
    setImageInputKey((prev) => prev + 1);
    setEditingQuestionId(null);
  };

  const loadQuiz = async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      setQuiz(response.data.quiz);
      setQuizMetaForm(buildQuizMetaForm(response.data.quiz));
      setQuestions(response.data.questions);
    } catch (err) {
      const message = extractApiError(err, 'Не удалось выполнить действие.');
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  useEffect(() => {
    return () => {
      revokePreviewIfNeeded(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const addOption = () => {
    setForm((prev) => {
      if (prev.options.length >= 10) return prev;
      return {
        ...prev,
        options: [...prev.options, { text: '', imageUrl: '', isCorrect: false }],
      };
    });
  };

  const removeOption = (index) => {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;
      const nextOptions = prev.options.filter((_, optionIndex) => optionIndex !== index);
      if (prev.answerMode === 'single' && !nextOptions.some((item) => item.isCorrect)) {
        nextOptions[0].isCorrect = true;
      }
      return { ...prev, options: nextOptions };
    });
  };

  const updateOption = (index, updates) => {
    setForm((prev) => {
      const nextOptions = prev.options.map((option, optionIndex) => {
        if (optionIndex !== index) return option;
        return { ...option, ...updates };
      });

      if (prev.answerMode === 'single' && updates.isCorrect) {
        for (let i = 0; i < nextOptions.length; i += 1) {
          if (i !== index) {
            nextOptions[i].isCorrect = false;
          }
        }
      }

      return { ...prev, options: nextOptions };
    });
  };

  const onAnswerModeChange = (value) => {
    setForm((prev) => {
      const nextOptions = prev.options.map((option, index) => ({
        ...option,
        isCorrect: value === 'single' ? index === 0 : option.isCorrect,
      }));
      return { ...prev, answerMode: value, options: nextOptions };
    });
  };

  const onImageSelected = (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);

    revokePreviewIfNeeded(imagePreviewUrl);

    if (!file) {
      setImagePreviewUrl(form.imageUrl || '');
      return;
    }

    setForm((prev) => ({ ...prev, imageUrl: prev.imageUrl || '' }));
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const startEditingQuestion = (question) => {
    setEditingQuestionId(question.id);
    setImageFile(null);
    revokePreviewIfNeeded(imagePreviewUrl);

    setForm({
      prompt: question.prompt,
      questionType: question.question_type,
      imageUrl: question.image_url || '',
      answerMode: question.answer_mode,
      points: Number(question.points),
      timeLimitSeconds: question.time_limit_seconds ? String(question.time_limit_seconds) : '',
      options: question.options.map((option) => ({
        text: option.text,
        imageUrl: option.image_url || '',
        isCorrect: option.is_correct === 1,
      })),
    });

    setImagePreviewUrl(question.image_url || '');
    setImageInputKey((prev) => prev + 1);

    window.requestAnimationFrame(() => {
      editorSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const onDeleteQuestion = async (question) => {
    const confirmed = window.confirm(`Удалить вопрос "${question.prompt}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingQuestionId(question.id);
    try {
      await api.delete(`/quizzes/${quizId}/questions/${question.id}`);
      if (editingQuestionId === question.id) {
        resetEditorForm();
      }
      await loadQuiz();
      toast.success('Вопрос удален.');
    } catch (err) {
      toast.error(extractApiError(err, 'Не удалось выполнить действие.'));
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    if (form.questionType === 'image' && !imageFile && !form.imageUrl) {
      toast.error('Для вопроса с изображением загрузите файл с компьютера.');
      setSaving(false);
      return;
    }

    if (form.options.some((option) => !option.text.trim())) {
      toast.error('Заполните текст всех вариантов ответа.');
      setSaving(false);
      return;
    }

    const correctCount = form.options.filter((item) => item.isCorrect).length;
    if (correctCount < 1) {
      toast.error('Нужен хотя бы один правильный вариант.');
      setSaving(false);
      return;
    }

    if (form.answerMode === 'single' && correctCount !== 1) {
      toast.error('Для одиночного выбора должен быть один правильный вариант.');
      setSaving(false);
      return;
    }

    try {
      let imageUrl = form.questionType === 'image' ? form.imageUrl || '' : '';
      if (form.questionType === 'image' && imageFile) {
        const data = new FormData();
        data.append('image', imageFile);

        const uploadResponse = await api.post('/uploads/image', data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        imageUrl = uploadResponse.data.url;
      }

      const payload = {
        ...form,
        points: Number(form.points),
        imageUrl,
        timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : undefined,
      };

      if (editingQuestionId) {
        await api.put(`/quizzes/${quizId}/questions/${editingQuestionId}`, payload);
      } else {
        await api.post(`/quizzes/${quizId}/questions`, payload);
      }

      resetEditorForm();
      await loadQuiz();
      toast.success(editingQuestionId ? 'Вопрос обновлен.' : 'Вопрос успешно добавлен.');
    } catch (err) {
      toast.error(extractApiError(err, 'Не удалось выполнить действие.'));
    } finally {
      setSaving(false);
    }
  };

  const onSaveQuizMeta = async (event) => {
    event.preventDefault();

    const normalizedTime = Number(quizMetaForm.timePerQuestion);
    if (!Number.isFinite(normalizedTime)) {
      toast.error('Укажите корректное время на вопрос.');
      return;
    }

    setSavingQuizMeta(true);
    try {
      const response = await api.put(`/quizzes/${quizId}`, {
        title: quizMetaForm.title,
        category: quizMetaForm.category,
        rules: quizMetaForm.rules,
        timePerQuestion: normalizedTime,
      });
      setQuiz(response.data.quiz);
      setQuizMetaForm(buildQuizMetaForm(response.data.quiz));
      toast.success('Параметры квиза обновлены.');
    } catch (err) {
      toast.error(extractApiError(err, 'Не удалось выполнить действие.'));
    } finally {
      setSavingQuizMeta(false);
    }
  };

  const onQuestionTypeChange = (event) => {
    const nextType = event.target.value;
    setForm((prev) => ({
      ...prev,
      questionType: nextType,
    }));

    if (nextType === 'text') {
      setImageFile(null);
      revokePreviewIfNeeded(imagePreviewUrl);
      setImagePreviewUrl('');
      setForm((prev) => ({ ...prev, imageUrl: '' }));
      setImageInputKey((prev) => prev + 1);
    }
  };

  if (loading) {
    return <div className="page-center">Загружаем квиз...</div>;
  }

  if (!quiz) {
    return (
      <div className="page-grid">
        <p className="error-text">{pageError || 'Квиз не найден.'}</p>
        <Link to="/dashboard" className="button button-outline">
          Вернуться в кабинет
        </Link>
      </div>
    );
  }

  return (
    <div className="page-grid quiz-editor-page">
      <QuizEditorHero quiz={quiz} />

      {canEdit && (
        <QuizMetaSettingsForm
          quizMetaForm={quizMetaForm}
          setQuizMetaForm={setQuizMetaForm}
          savingQuizMeta={savingQuizMeta}
          onSubmit={onSaveQuizMeta}
          onReset={() => setQuizMetaForm(buildQuizMetaForm(quiz))}
        />
      )}

      <section className="card">
        <div className="row-between">
          <h2>Вопросы ({questions.length})</h2>
          <Link to="/dashboard" className="button button-small button-outline">
            Назад в кабинет
          </Link>
        </div>

        {questions.length === 0 ? (
          <p className="muted">Пока нет вопросов. Добавьте первый вопрос через форму ниже.</p>
        ) : (
          <div className="question-list">
            {questions.map((question) => (
              <QuestionItemCard
                key={question.id}
                question={question}
                canEdit={canEdit}
                deletingQuestionId={deletingQuestionId}
                defaultTimePerQuestion={quiz.timePerQuestion}
                onEdit={startEditingQuestion}
                onDelete={onDeleteQuestion}
              />
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <QuestionEditorForm
          editorSectionRef={editorSectionRef}
          editingQuestionId={editingQuestionId}
          form={form}
          imageInputKey={imageInputKey}
          imagePreviewUrl={imagePreviewUrl}
          saving={saving}
          onSubmit={onSubmit}
          onCancel={resetEditorForm}
          onPromptChange={(event) => setForm((prev) => ({ ...prev, prompt: event.target.value }))}
          onQuestionTypeChange={onQuestionTypeChange}
          onImageSelected={onImageSelected}
          onAnswerModeChange={(event) => onAnswerModeChange(event.target.value)}
          onPointsChange={(event) => setForm((prev) => ({ ...prev, points: Number(event.target.value) }))}
          onTimeLimitChange={(event) =>
            setForm((prev) => ({
              ...prev,
              timeLimitSeconds: event.target.value,
            }))
          }
          onOptionTextChange={(index, text) => updateOption(index, { text })}
          onOptionCorrectChange={(index, isCorrect) => updateOption(index, { isCorrect })}
          onRemoveOption={removeOption}
          onAddOption={addOption}
        />
      )}
    </div>
  );
}
