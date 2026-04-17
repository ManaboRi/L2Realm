// ══════════════════════════════════════════════
// L2Realm — API клиент
// ══════════════════════════════════════════════
import type { Server, ServersResponse, Stats, Review } from './types';

const BASE = typeof window !== 'undefined'
  ? '/backend/api'
  : (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:4000/api');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Серверы ───────────────────────────────────
export const api = {
  servers: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<ServersResponse>(`/servers${q}`);
    },
    get:    (id: string)  => request<Server>(`/servers/${id}`),
    stats:  ()            => request<Stats>('/servers/stats'),
    counts:     ()        => request<{ chronicles: Record<string,number>; rates: Record<string,number>; donates: Record<string,number>; types: Record<string,number> }>('/servers/counts'),
    comingSoon: ()        => request<Server[]>('/servers/coming-soon'),
    create: (data: Partial<Server>, token: string) =>
      request<Server>('/servers', { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    update: (id: string, data: Partial<Server>, token: string) =>
      request<Server>(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    delete: (id: string, token: string) =>
      request<void>(`/servers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    request: (data: any) =>
      request<any>('/servers/request', { method: 'POST', body: JSON.stringify(data) }),
    getRequests: (token: string) =>
      request<any[]>('/servers/admin/requests', { headers: { Authorization: `Bearer ${token}` } }),
    updateRequest: (id: string, status: string, token: string) =>
      request<any>(`/servers/admin/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }), headers: { Authorization: `Bearer ${token}` } }),
    deleteRequest: (id: string, token: string) =>
      request<any>(`/servers/admin/requests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  },

  // ── Отзывы ────────────────────────────────────
  reviews: {
    byServer: (serverId: string) => request<Review[]>(`/reviews/server/${serverId}`),
    create: (serverId: string, data: { rating: number; text: string }, token: string) =>
      request<Review>(`/reviews/server/${serverId}`, { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    pending: (token: string) =>
      request<any[]>('/reviews/pending', { headers: { Authorization: `Bearer ${token}` } }),
    approve: (id: string, token: string) =>
      request<any>(`/reviews/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    delete: (id: string, token: string) =>
      request<any>(`/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  },

  // ── Мониторинг ────────────────────────────────
  monitoring: {
    status: (serverId: string) => request<any>(`/monitoring/${serverId}`),
    uptime: (serverId: string, days = 7) => request<any>(`/monitoring/${serverId}/uptime?days=${days}`),
    daily:  (serverId: string, days = 30) => request<any>(`/monitoring/${serverId}/daily?days=${days}`),
  },

  // ── Оплата ────────────────────────────────────
  payments: {
    create: (data: { serverId: string; plan: string; returnUrl: string }) =>
      request<any>('/payments/create', { method: 'POST', body: JSON.stringify(data) }),
    subscription: (serverId: string) => request<any>(`/payments/subscription/${serverId}`),
    activate: (data: { serverId: string; plan: string }, token: string) =>
      request<any>('/payments/activate', { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    all: (token: string) =>
      request<any[]>('/payments/all', { headers: { Authorization: `Bearer ${token}` } }),
  },

  // ── Auth ──────────────────────────────────────
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    register: (data: any) =>
      request<{ access_token: string; user: any }>('/auth/register', {
        method: 'POST', body: JSON.stringify(data),
      }),
    me: (token: string) =>
      request<any>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
    forgotPassword: (email: string) =>
      request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  },
};
