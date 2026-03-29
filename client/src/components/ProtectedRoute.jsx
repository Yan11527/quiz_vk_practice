import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-center">Проверка авторизации...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
