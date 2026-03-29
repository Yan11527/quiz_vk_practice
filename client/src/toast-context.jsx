import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const EXIT_MS = 220;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);
  const timeoutMapRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timeouts = timeoutMapRef.current.get(id);
    if (timeouts) {
      clearTimeout(timeouts.closeTimer);
      clearTimeout(timeouts.removeTimer);
      timeoutMapRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scheduleClose = useCallback(
    (id, duration) => {
    const closeTimer = setTimeout(() => {
      setToasts((prev) => prev.map((item) => (item.id === id ? { ...item, closing: true } : item)));
      const removeTimer = setTimeout(() => {
        removeToast(id);
      }, EXIT_MS);

      const current = timeoutMapRef.current.get(id);
      if (current) {
        current.removeTimer = removeTimer;
        timeoutMapRef.current.set(id, current);
      }
    }, duration);

    timeoutMapRef.current.set(id, { closeTimer, removeTimer: null });
    },
    [removeToast],
  );

  const push = useCallback(
    ({ message, type = 'info', duration = 3200 }) => {
    const id = idRef.current;
    idRef.current += 1;

    setToasts((prev) => [...prev, { id, message, type, closing: false }]);
    scheduleClose(id, duration);
    return id;
    },
    [scheduleClose],
  );

  const info = useCallback((message, duration) => push({ message, type: 'info', duration }), [push]);
  const success = useCallback((message, duration) => push({ message, type: 'success', duration }), [push]);
  const warning = useCallback((message, duration) => push({ message, type: 'warning', duration }), [push]);
  const error = useCallback((message, duration) => push({ message, type: 'error', duration }), [push]);

  const api = useMemo(
    () => ({
      push,
      info,
      success,
      warning,
      error,
      dismiss: removeToast,
      toasts,
    }),
    [push, info, success, warning, error, removeToast, toasts],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
