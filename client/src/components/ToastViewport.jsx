import { useToast } from '../toast-context';

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <aside className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} ${toast.closing ? 'toast-closing' : ''}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <p>{toast.message}</p>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label="Закрыть уведомление">
            x
          </button>
        </div>
      ))}
    </aside>
  );
}
