import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { useToast } from '../toast-context';

function extractError(error) {
  return error?.response?.data?.error || 'Не удалось выполнить регистрацию.';
}

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'participant',
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Регистрация</h1>
        <p className="muted">Выберите роль: организатор создает квизы, участник подключается по коду комнаты.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Имя
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

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

          <label>
            Роль
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="participant">Участник</option>
              <option value="organizer">Организатор</option>
            </select>
          </label>

          <button type="submit" className="button" disabled={submitting}>
            {submitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
