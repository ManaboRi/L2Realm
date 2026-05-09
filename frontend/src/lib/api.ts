// ══════════════════════════════════════════════
// L2Realm — API клиент
// ══════════════════════════════════════════════
import type { Server, ServersResponse, Stats, Review, FavoriteServer, User, VipStatus, Boost, Subscription, VoteStatus, VoteSummary, Article } from './types';

const BASE = typeof window !== 'undefined'
  ? '/api/proxy'
  : (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:4000/api');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const isLoginFlow = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/vk/callback');
    if (res.status === 401 && typeof window !== 'undefined' && !isLoginFlow) {
      localStorage.removeItem('l2r_token');
      localStorage.removeItem('l2r_user');
      window.dispatchEvent(new Event('l2r-auth-expired'));
      throw new Error('Сессия истекла. Войдите заново.');
    }
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
    counts: (params?: Record<string, string>) => {
      const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ chronicles: Record<string,number>; rates: Record<string,number>; donates: Record<string,number>; types: Record<string,number> }>(`/servers/counts${q}`);
    },
    comingSoon: ()        => request<Server[]>('/servers/coming-soon'),
    create: (data: Partial<Server>, token: string) =>
      request<Server>('/servers', { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    update: (id: string, data: Partial<Server>, token: string) =>
      request<Server>(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    delete: (id: string, token: string) =>
      request<void>(`/servers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    request: (data: any, token: string) =>
      request<any>('/servers/request', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
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
    my: (token: string) =>
      request<any[]>('/reviews/my', { headers: { Authorization: `Bearer ${token}` } }),
    create: (serverId: string, data: { rating: number; text: string }, token: string) =>
      request<Review>(`/reviews/server/${serverId}`, { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    pending: (token: string) =>
      request<any[]>('/reviews/pending', { headers: { Authorization: `Bearer ${token}` } }),
    approve: (id: string, token: string) =>
      request<any>(`/reviews/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    delete: (id: string, token: string) =>
      request<any>(`/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    recalcAll: (token: string) =>
      request<{ ok: boolean; recalculated: number }>('/reviews/recalc-all', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  },

  // ── Мониторинг ────────────────────────────────
  monitoring: {
    status: (serverId: string) => request<any>(`/monitoring/${serverId}`),
    uptime: (serverId: string, days = 7) => request<any>(`/monitoring/${serverId}/uptime?days=${days}`),
    daily:  (serverId: string, days = 30) => request<any>(`/monitoring/${serverId}/daily?days=${days}`),
  },

  // ── Оплата ────────────────────────────────────
  payments: {
    // Покупка VIP, VIP в «Скоро открытие» или буста (ЮКасса). Требует JWT — email пользователя уходит в чек.
    purchase: (data: { kind: 'vip' | 'boost' | 'soon_vip'; serverId: string; instanceId?: string | null; returnUrl: string }, token: string) =>
      request<{ dev?: boolean; activated?: boolean; paymentId?: string; confirmationUrl?: string }>(
        '/payments/purchase', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    purchaseSoon: (data: { name: string; chronicle: string; rates: string; url: string; openedDate: string; contact: string; returnUrl: string }, token: string) =>
      request<{ dev?: boolean; activated?: boolean; paymentId?: string; confirmationUrl?: string; requestId?: string }>(
        '/payments/purchase-soon', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    vipStatus: () => request<VipStatus>('/payments/vip/status'),
    soonVipStatus: () => request<VipStatus>('/payments/vip/soon-status'),
    subscription: (serverId: string) => request<Subscription | null>(`/payments/subscription/${serverId}`),
    boost: (serverId: string) => request<Boost | null>(`/payments/boost/${serverId}`),
    allSubs: (token: string) =>
      request<any[]>('/payments/all', { headers: { Authorization: `Bearer ${token}` } }),
    allBoosts: (token: string) =>
      request<any[]>('/payments/boosts/all', { headers: { Authorization: `Bearer ${token}` } }),
    grantVip: (serverId: string, token: string) =>
      request<any>(`/payments/vip/${serverId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    revokeVip: (serverId: string, token: string) =>
      request<any>(`/payments/vip/${serverId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    grantSoonVip: (serverId: string, instanceId: string | null | undefined, token: string) =>
      request<any>(`/payments/vip/soon/${serverId}`, { method: 'POST', body: JSON.stringify({ instanceId: instanceId ?? null }), headers: { Authorization: `Bearer ${token}` } }),
    revokeSoonVip: (serverId: string, instanceId: string | null | undefined, token: string) =>
      request<any>(`/payments/vip/soon/${serverId}`, { method: 'DELETE', body: JSON.stringify({ instanceId: instanceId ?? null }), headers: { Authorization: `Bearer ${token}` } }),
    grantBoost: (serverId: string, token: string) =>
      request<any>(`/payments/boost/${serverId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    revokeBoost: (serverId: string, token: string) =>
      request<any>(`/payments/boost/${serverId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
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
    changePassword: (oldPassword: string, newPassword: string, token: string) =>
      request<any>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
        headers: { Authorization: `Bearer ${token}` },
      }),
    sendCode: (email: string) =>
      request<{ ok: boolean }>('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
    verifyCode: (email: string, code: string) =>
      request<{ access_token: string; user: any }>('/auth/verify-code', {
        method: 'POST', body: JSON.stringify({ email, code }),
      }),
    vkCallback: (data: { code: string; deviceId: string; codeVerifier: string; redirectUri: string; state: string }) =>
      request<{ access_token: string; user: any }>('/auth/vk/callback', {
        method: 'POST', body: JSON.stringify(data),
      }),
    updateNickname: (nickname: string, token: string) =>
      request<User>('/auth/nickname', {
        method: 'PATCH',
        body: JSON.stringify({ nickname }),
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  // ── Статьи блога ─────────────────────────────
  articles: {
    list:  ()                  => request<Article[]>('/articles'),
    get:   (slug: string)      => request<Article>(`/articles/${slug}`),
    adminList: (token: string) =>
      request<Article[]>('/articles/admin/all', { headers: { Authorization: `Bearer ${token}` } }),
    adminGet: (id: string, token: string) =>
      request<Article>(`/articles/admin/by-id/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    create: (data: Partial<Article>, token: string) =>
      request<Article>('/articles', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    update: (id: string, data: Partial<Article>, token: string) =>
      request<Article>(`/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    delete: (id: string, token: string) =>
      request<void>(`/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    // Сброс SSR-кеша Next.js после правки статьи (вне api/proxy — это Next.js route).
    // Если slug передан — также инвалидирует /blog/<slug>.
    revalidate: (slug: string | undefined, token: string) =>
      fetch('/api/admin/revalidate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, token }),
      }).then(r => r.json()).catch(() => ({ ok: false })),
  },

  // ── Голосование ──────────────────────────────
  votes: {
    vote: (serverId: string, nickname: string, token?: string | null) =>
      request<{ success: boolean; nickname: string }>(`/votes/${serverId}`, {
        method: 'POST',
        body: JSON.stringify({ nickname }),
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    status: (serverId: string, token?: string | null) =>
      request<VoteStatus>(`/votes/${serverId}/status`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    summary: (serverId: string) =>
      request<VoteSummary>(`/votes/${serverId}/summary`),
  },

  // ── Избранное ─────────────────────────────────
  favorites: {
    list: (token: string) =>
      request<FavoriteServer[]>('/favorites', { headers: { Authorization: `Bearer ${token}` } }),
    ids: (token: string) =>
      request<string[]>('/favorites/ids', { headers: { Authorization: `Bearer ${token}` } }),
    add: (serverId: string, token: string) =>
      request<any>(`/favorites/${serverId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    remove: (serverId: string, token: string) =>
      request<any>(`/favorites/${serverId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  },
};
