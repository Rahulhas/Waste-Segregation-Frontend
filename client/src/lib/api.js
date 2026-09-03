const API_URL = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  me: () => request('/auth/me'),

  auditLogs: () => request('/auth/audit-logs'),

  submitCitizenRequest: (payload) =>
    request('/citizen-requests', { method: 'POST', body: JSON.stringify(payload) }),

  trackCitizenRequest: (ticketId) => request(`/citizen-requests/track/${ticketId}`),

  citizenRequests: (params = '') => request(`/citizen-requests${params ? `?${params}` : ''}`),

  updateCitizenRequestStatus: (ticketId, payload) =>
    request(`/citizen-requests/${ticketId}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  roadRoute: (stops) =>
    request('/routes/road', { method: 'POST', body: JSON.stringify({ stops }) }),
};
