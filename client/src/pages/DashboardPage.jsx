import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateQuizForm from '../components/dashboard/CreateQuizForm';
import HistoryCard from '../components/dashboard/HistoryCard';
import QuizCard from '../components/dashboard/QuizCard';
import LeaderboardModal from '../components/leaderboard/LeaderboardModal';
import { useAuth } from '../auth-context';
import { api } from '../lib/api';
import { extractApiError } from '../lib/error-utils';
import { useToast } from '../toast-context';

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: '',
    category: '',
    rules: '',
    timePerQuestion: 20,
  });
  const [roomCode, setRoomCode] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [historyLeaderboard, setHistoryLeaderboard] = useState([]);
  const [historyLeaderboardOpen, setHistoryLeaderboardOpen] = useState(false);
  const [historyLeaderboardLoading, setHistoryLeaderboardLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      if (user.role === 'organizer') {
        const [quizzesResponse, historyResponse] = await Promise.all([
          api.get('/quizzes/mine'),
          api.get('/history/me'),
        ]);
        setQuizzes(quizzesResponse.data.quizzes);
        setHistory(historyResponse.data.history);
      } else {
        const historyResponse = await api.get('/history/me');
        setHistory(historyResponse.data.history);
      }
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreateQuiz = async (event) => {
    event.preventDefault();
    setBusyAction('create');

    try {
      const response = await api.post('/quizzes', {
        ...createForm,
        timePerQuestion: Number(createForm.timePerQuestion),
      });
      setCreateForm({ title: '', category: '', rules: '', timePerQuestion: 20 });
      navigate(`/quiz/${response.data.quiz.id}/edit`);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusyAction('');
    }
  };

  const onStartSession = async (quizId) => {
    setBusyAction(`start-${quizId}`);

    try {
      const response = await api.post('/sessions/start', { quizId });
      navigate(`/live/${response.data.session.roomCode}`);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusyAction('');
    }
  };

  const onDeleteQuiz = async (quiz) => {
    const confirmed = window.confirm(
      `Удалить квиз "${quiz.title}"?\nБудут удалены вопросы и история его сессий.`,
    );
    if (!confirmed) {
      return;
    }

    setBusyAction(`delete-${quiz.id}`);
    try {
      await api.delete(`/quizzes/${quiz.id}`);
      const historyResponse = await api.get('/history/me');
      setQuizzes((prev) => prev.filter((item) => item.id !== quiz.id));
      setHistory(historyResponse.data.history || []);
      toast.success('Квиз удален.');
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusyAction('');
    }
  };

  const onJoinSession = async (event) => {
    event.preventDefault();
    setBusyAction('join');

    try {
      const response = await api.post('/sessions/join', { roomCode });
      navigate(`/live/${response.data.roomCode}`);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusyAction('');
    }
  };

  const openHistoryLeaderboard = async (item) => {
    setHistoryLeaderboardLoading(true);
    setSelectedHistorySession(item);
    setHistoryLeaderboardOpen(true);

    try {
      const response = await api.get(`/sessions/${item.room_code}/leaderboard`);
      setHistoryLeaderboard(response.data.leaderboard || []);
    } catch (err) {
      setHistoryLeaderboard([]);
      toast.error(extractApiError(err));
    } finally {
      setHistoryLeaderboardLoading(false);
    }
  };

  if (loading) {
    return <div className="page-center">Загружаем личный кабинет...</div>;
  }

  return (
    <div className="page-grid dashboard-page">
      <section className="hero-panel">
        <h1>Личный кабинет</h1>
        <p>
          {user.role === 'organizer'
            ? 'Создавайте квизы, запускайте комнаты и управляйте ходом опроса.'
            : 'Подключайтесь к активной комнате по коду и отслеживайте свои результаты.'}
        </p>
      </section>

      {user.role === 'organizer' ? (
        <>
          <section className="card">
            <h2>Создать квиз</h2>
            <CreateQuizForm
              createForm={createForm}
              setCreateForm={setCreateForm}
              busyAction={busyAction}
              onSubmit={onCreateQuiz}
            />
          </section>

          <section className="card">
            <h2>Мои квизы</h2>
            {quizzes.length === 0 ? (
              <p className="muted">Пока нет квизов. Создайте первый в форме выше.</p>
            ) : (
              <div className="quiz-grid">
                {quizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    busyAction={busyAction}
                    onStartSession={onStartSession}
                    onDeleteQuiz={onDeleteQuiz}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <h2>Подключение к квизу</h2>
          <form className="inline-form" onSubmit={onJoinSession}>
            <input
              type="text"
              required
              placeholder="Введите код комнаты"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            />
            <button type="submit" className="button" disabled={busyAction === 'join'}>
              {busyAction === 'join' ? 'Подключаем...' : 'Подключиться'}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>{user.role === 'organizer' ? 'История проведенных квизов' : 'История участия'}</h2>
        {history.length === 0 ? (
          <p className="muted">История пока пустая.</p>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <HistoryCard
                key={item.session_id}
                item={item}
                isOrganizer={user.role === 'organizer'}
                onOpen={openHistoryLeaderboard}
              />
            ))}
          </div>
        )}
      </section>

      <LeaderboardModal
        open={historyLeaderboardOpen}
        title={`Лидерборд сессии ${selectedHistorySession?.room_code || ''}`}
        loading={historyLeaderboardLoading}
        leaderboard={historyLeaderboard}
        emptyText="Нет данных по участникам."
        onClose={() => setHistoryLeaderboardOpen(false)}
      />
    </div>
  );
}
