import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/dashboard" className="brand">
          Квиз Комната
        </Link>
        <nav className="topbar-nav">
          <NavLink to="/dashboard" className="top-link">
            Кабинет
          </NavLink>
        </nav>
        <div className="topbar-user">
          <span>
            {user?.name} ({user?.role === 'organizer' ? 'Организатор' : 'Участник'})
          </span>
          <button type="button" className="button button-outline" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="main-layout">{children}</main>
    </div>
  );
}
