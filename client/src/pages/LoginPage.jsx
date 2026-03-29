import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { useToast } from '../toast-context';

function extractError(error) {
  return error?.response?.data?.error || 'Не удалось выполнить вход.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Вход в Квиз Комната</h1>
        <p className="muted">Проводите квизы в реальном времени или подключайтесь как участник.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>

          <button type="submit" className="button" disabled={submitting}>
            {submitting ? 'Выполняется вход...' : 'Войти'}
          </button>
        </form>

        <p className="auth-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
