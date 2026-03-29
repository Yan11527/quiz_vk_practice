import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LeaderboardShowcase from '../components/leaderboard/LeaderboardShowcase';
import CurrentQuestionCard from '../components/live/CurrentQuestionCard';
import LiveSessionHeader from '../components/live/LiveSessionHeader';
import ParticipantsCard from '../components/live/ParticipantsCard';
import SessionControlCard from '../components/live/SessionControlCard';
import WinnerModal from '../components/live/WinnerModal';
import { useAuth } from '../auth-context';
import { api, SERVER_URL } from '../lib/api';
import { extractApiError } from '../lib/error-utils';
import { getSessionStatusMeta } from '../lib/status-utils';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { useToast } from '../toast-context';

export default function LiveQuizPage() {
  const { roomCode } = useParams();
  const normalizedRoomCode = useMemo(() => String(roomCode || '').toUpperCase(), [roomCode]);
  const { user, token } = useAuth();
  const { success, info, warning, error: notifyError } = useToast();

  const socketRef = useRef(null);

  const [session, setSession] = useState(null);
  const [questionPayload, setQuestionPayload] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [connectedParticipants, setConnectedParticipants] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState(null);

  const hasShownWinnerModalRef = useRef(false);
  const hasHandledFinishedRef = useRef(false);
  const leaderboardRef = useRef([]);

  const isOrganizer = user.role === 'organizer';

  const getWinnerFromLeaderboard = useCallback((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const top = rows[0];
    return {
      name: top.name,
      totalScore: Number(top.total_score ?? top.totalScore ?? 0),
    };
  }, []);

  const openWinnerModal = useCallback((winnerPayload) => {
    if (hasShownWinnerModalRef.current) {
      return;
    }
    hasShownWinnerModalRef.current = true;
    setWinner(winnerPayload);
    setShowWinnerModal(true);
  }, []);

  useEffect(() => {
    leaderboardRef.current = leaderboard;
  }, [leaderboard]);

  useEffect(() => {
    hasShownWinnerModalRef.current = false;
    hasHandledFinishedRef.current = false;
    setShowWinnerModal(false);
    setWinner(null);
  }, [normalizedRoomCode]);

  useEffect(() => {
    if (session?.status !== 'finished') {
      hasHandledFinishedRef.current = false;
      return;
    }

    if (hasHandledFinishedRef.current) {
      return;
    }
    hasHandledFinishedRef.current = true;

    const loadFinalLeaderboard = async () => {
      try {
        const response = await api.get(`/sessions/${normalizedRoomCode}/leaderboard`);
        const rows = response.data.leaderboard || [];
        setLeaderboard(rows);
        openWinnerModal(getWinnerFromLeaderboard(rows));
      } catch {
        // Final leaderboard will stay as last known state from socket/state API.
      }
    };

    setFinished(true);
    setQuestionPayload(null);
    success('Квиз завершен. Финальный лидерборд зафиксирован.');
    openWinnerModal(getWinnerFromLeaderboard(leaderboardRef.current));
    loadFinalLeaderboard();
  }, [session?.status, normalizedRoomCode, success, openWinnerModal, getWinnerFromLeaderboard]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await api.get(`/sessions/${normalizedRoomCode}/state`);
        setSession(response.data.session);
        setLeaderboard(response.data.leaderboard || []);
        setConnectedParticipants((response.data.leaderboard || []).map((entry) => ({
          userId: entry.user_id,
          name: entry.name,
        })));
        setFinished(response.data.session?.status === 'finished');
        if (response.data.session?.status === 'finished') {
          setQuestionPayload(null);
          openWinnerModal(getWinnerFromLeaderboard(response.data.leaderboard || []));
        }
        if (response.data.currentQuestion) {
          setQuestionPayload(response.data.currentQuestion);
        }
      } catch (err) {
        if (user.role === 'participant' && err?.response?.status === 403) {
          try {
            await api.post('/sessions/join', { roomCode: normalizedRoomCode });
            const retry = await api.get(`/sessions/${normalizedRoomCode}/state`);
            setSession(retry.data.session);
            setLeaderboard(retry.data.leaderboard || []);
            setConnectedParticipants((retry.data.leaderboard || []).map((entry) => ({
              userId: entry.user_id,
              name: entry.name,
            })));
            setFinished(retry.data.session?.status === 'finished');
            if (retry.data.session?.status === 'finished') {
              setQuestionPayload(null);
              openWinnerModal(getWinnerFromLeaderboard(retry.data.leaderboard || []));
            }
            if (retry.data.currentQuestion) {
              setQuestionPayload(retry.data.currentQuestion);
            }
            return;
          } catch (joinError) {
            notifyError(extractApiError(joinError, 'Произошла ошибка.'));
            return;
          }
        }
        notifyError(extractApiError(err, 'Произошла ошибка.'));
      }
    };

    loadState();
  }, [normalizedRoomCode, user.role, notifyError, openWinnerModal, getWinnerFromLeaderboard]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(SERVER_URL, {
      auth: { token },
      autoConnect: false,
    });

    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      socket.emit('room:join', { roomCode: normalizedRoomCode });
    });

    socket.on('room:joined', (payload) => {
      success(`Подключено к комнате ${payload.roomCode}.`);
      setLeaderboard(payload.leaderboard || []);
      setSession((prev) => ({
        ...prev,
        roomCode: payload.roomCode,
        status: payload.sessionStatus,
        quizTitle: payload.quizTitle,
        quizCategory: payload.quizCategory,
        quizRules: payload.quizRules,
      }));
      setConnectedParticipants(payload.connectedParticipants || []);
      if (payload.sessionStatus === 'finished') {
        setFinished(true);
        setQuestionPayload(null);
      }
    });

    socket.on('quiz:started', (payload) => {
      setFinished(false);
      success(`Квиз запущен. Вопросов: ${payload.totalQuestions}.`);
      setSession((prev) => ({ ...prev, status: 'active' }));
    });

    socket.on('question:show', (payload) => {
      setQuestionPayload(payload);
      setSubmitted(false);
      setSelectedOptionIds([]);
      info('Новый вопрос доступен.');
    });

    socket.on('question:closed', () => {
      setQuestionPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          endsAt: Date.now(),
        };
      });
      warning('Время на вопрос истекло.');
    });

    socket.on('answer:accepted', () => {
      setSubmitted(true);
      success('Ответ принят.');
    });

    socket.on('leaderboard:update', (payload) => {
      setLeaderboard(payload.leaderboard || []);
    });

    socket.on('participants:update', (payload) => {
      setConnectedParticipants(payload.participants || []);
    });

    socket.on('quiz:finished', (payload) => {
      setFinished(true);
      setQuestionPayload(null);
      setLeaderboard(payload.leaderboard || []);
      openWinnerModal(
        payload.winner
          ? {
              name: payload.winner.name,
              totalScore: Number(payload.winner.total_score ?? 0),
            }
          : getWinnerFromLeaderboard(payload.leaderboard || []),
      );
      setSession((prev) => ({ ...prev, status: 'finished' }));
      success(payload.winner ? `Победитель: ${payload.winner.name}` : 'Квиз завершен.');
    });

    socket.on('error:event', (payload) => {
      notifyError(payload.message || 'Ошибка сокета.');
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        return;
      }
      warning('Соединение закрыто.');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, normalizedRoomCode, success, info, warning, notifyError, openWinnerModal, getWinnerFromLeaderboard]);

  useEffect(() => {
    if (!questionPayload?.endsAt) {
      setTimeLeft(0);
      return undefined;
    }

    const tick = () => {
      const next = Math.max(0, Math.ceil((questionPayload.endsAt - Date.now()) / 1000));
      setTimeLeft(next);
    };

    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [questionPayload?.endsAt]);

  const currentQuestion = questionPayload?.question || null;
  const answerLocked = !currentQuestion || submitted || timeLeft <= 0 || finished;
  const showFinalLeaderboard = finished || session?.status === 'finished';
  const showWaitingParticipants = isOrganizer && session?.status === 'waiting';
  const statusMeta = getSessionStatusMeta(session?.status);

  const toggleOption = (optionId) => {
    if (!currentQuestion || answerLocked) {
      return;
    }

    if (currentQuestion.answerMode === 'single') {
      setSelectedOptionIds([optionId]);
      return;
    }

    setSelectedOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  };

  const submitAnswer = () => {
    if (!currentQuestion || selectedOptionIds.length === 0 || answerLocked) {
      return;
    }

    socketRef.current?.emit('question:answer', {
      roomCode: normalizedRoomCode,
      questionId: currentQuestion.id,
      optionIds: selectedOptionIds,
    });
  };

  const startQuiz = () => {
    socketRef.current?.emit('quiz:start', { roomCode: normalizedRoomCode });
  };

  const nextQuestion = (forceClose = false) => {
    socketRef.current?.emit('quiz:next-question', {
      roomCode: normalizedRoomCode,
      forceClose,
    });
  };

  const finishQuiz = () => {
    socketRef.current?.emit('quiz:finish', { roomCode: normalizedRoomCode });
  };

  return (
    <div className="page-grid live-quiz-page">
      <LiveSessionHeader roomCode={normalizedRoomCode} session={session} statusMeta={statusMeta} />

      {isOrganizer && (
        <SessionControlCard
          onStartQuiz={startQuiz}
          onNextQuestion={nextQuestion}
          onFinishQuiz={finishQuiz}
        />
      )}

      {showWaitingParticipants ? (
        <ParticipantsCard participants={connectedParticipants} />
      ) : (
        <CurrentQuestionCard
          currentQuestion={currentQuestion}
          questionPayload={questionPayload}
          timeLeft={timeLeft}
          finished={finished}
          isOrganizer={isOrganizer}
          selectedOptionIds={selectedOptionIds}
          answerLocked={answerLocked}
          submitted={submitted}
          onToggleOption={toggleOption}
          onSubmitAnswer={submitAnswer}
        />
      )}

      {showFinalLeaderboard && (
        <section className="card">
          <h2>Лидерборд</h2>
          <LeaderboardShowcase leaderboard={leaderboard} emptyText="Нет данных по итоговым баллам." />
        </section>
      )}

      <WinnerModal open={showWinnerModal} winner={winner} onClose={() => setShowWinnerModal(false)} />
    </div>
  );
}
