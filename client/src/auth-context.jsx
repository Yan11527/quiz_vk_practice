import { createContext, useContext, useEffect, useState } from 'react';
import { api, setApiToken } from './lib/api';

const STORAGE_KEY = 'quiz_mvp_auth';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.token && parsed.user) {
        setToken(parsed.token);
        setUser(parsed.user);
        setApiToken(parsed.token);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  }, [token, user]);

  const authSuccess = ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken);
    setUser(nextUser);
    setApiToken(nextToken);
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    authSuccess(response.data);
    return response.data;
  };

  const login = async (payload) => {
    const response = await api.post('/auth/login', payload);
    authSuccess(response.data);
    return response.data;
  };

  const refreshMe = async () => {
    if (!token) {
      return null;
    }

    setApiToken(token);
    const response = await api.get('/me');
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setApiToken(null);
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    refreshMe,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
