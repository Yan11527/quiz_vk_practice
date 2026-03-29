import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth-context';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QuizEditorPage from './pages/QuizEditorPage';
import LiveQuizPage from './pages/LiveQuizPage';
import ToastViewport from './components/ToastViewport';

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function AuthOnly({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <AuthOnly>
              <DashboardPage />
            </AuthOnly>
          }
        />

        <Route
          path="/quiz/:quizId/edit"
          element={
            <AuthOnly>
              <ProtectedRoute roles={['organizer']}>
                <QuizEditorPage />
              </ProtectedRoute>
            </AuthOnly>
          }
        />

        <Route
          path="/live/:roomCode"
          element={
            <AuthOnly>
              <LiveQuizPage />
            </AuthOnly>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}
