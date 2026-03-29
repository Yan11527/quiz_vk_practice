import axios from 'axios';

const API_BASE = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DEFAULT_SERVER_URL = typeof window !== 'undefined' ? window.location.origin : '';

export const SERVER_URL = String(import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL).replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_BASE,
});

export function setApiToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
