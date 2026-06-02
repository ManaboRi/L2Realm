// ══════════════════════════════════════════════
// L2Realm — API клиент
// ══════════════════════════════════════════════
import type { Server, ServersResponse, Stats, VipStatus, Boost, Subscription, VoteStatus, VoteSummary, Article, OpeningReminder, OpeningWaitResult, OpeningWaitTopItem, OpeningClickResult, OpeningClickReport } from './types';

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
    const isLoginFlow = path.startsWith('/auth/login');
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
      return request<{ chronicles: Record<string,number>; rates: Record<string,number>; donates: Record<string,number>; types: Record<string,number>; activities: Record<string,number>; trusts: Record<string,number> }>(`/servers/counts${q}`);
    },
    comingSoon: ()        => request<Server[]>('/servers/coming-soon'),
    create: (data: Partial<Server>, token: string) =>
      request<Server>('/servers', { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    update: (id: string, data: Partial<Server>, token: string) =>
      request<Server>(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
    saveTrafficSnapshot: (id: string, data: { period: string; monthly: number; source?: string }, token: string) =>
      request<Pick<Server, 'id' | 'trafficHistory' | 'trafficMonthly' | 'trafficThreeMonths' | 'trafficPeriod' | 'trafficSource'>>(
        `/servers/${id}/traffic`,
        { method: 'PUT', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } },
      ),
    deleteTrafficSnapshot: (id: string, period: string, token: string) =>
      request<Pick<Server, 'id' | 'trafficHistory' | 'trafficMonthly' | 'trafficThreeMonths' | 'trafficPeriod' | 'trafficSource'>>(
        `/servers/${id}/traffic/${encodeURIComponent(period)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      ),
    delete: (id: string, token: string) =>
      request<void>(`/servers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    testOnlineSource: (data: any, token: string) =>
      request<{ ok: boolean; online: number; source: string; checkedAt: string; usedListPath?: string; matchValue?: string; valuePath?: string; robots?: { checked: boolean; allowed: boolean; robotsUrl: string; crawlDelay?: string | null; reason?: string } }>(
        '/servers/admin/online/test',
        { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } },
      ),
    getRequests: (token: string) =>
      request<any[]>('/servers/admin/requests', { headers: { Authorization: `Bearer ${token}` } }),
    updateRequest: (id: string, status: string, token: string) =>
      request<any>(`/servers/admin/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }), headers: { Authorization: `Bearer ${token}` } }),
    deleteRequest: (id: string, token: string) =>
      request<any>(`/servers/admin/requests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  },

  // ── Мониторинг ────────────────────────────────
  monitoring: {
    status: (serverId: string) => request<any>(`/monitoring/${serverId}`),
    uptime: (serverId: string, days = 7) => request<any>(`/monitoring/${serverId}/uptime?days=${days}`),
    daily:  (serverId: string, days = 30) => request<any>(`/monitoring/${serverId}/daily?days=${days}`),
  },

  // ── VIP / буст (выдаются вручную из админки, без онлайн-оплаты) ──
  payments: {
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

  // ── Auth (вход администратора: по ключу-файлу или email+паролю) ──
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    keyLogin: (key: string) =>
      request<{ access_token: string; user: any }>('/auth/key-login', {
        method: 'POST', body: JSON.stringify({ key }),
      }),
    me: (token: string) =>
      request<any>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
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
    revalidate: (slug: string | undefined, token: string) =>
      fetch('/api/admin/revalidate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, token }),
      }).then(r => r.json()).catch(() => ({ ok: false })),
  },

  // ── Голосование (анонимное, по IP + ник персонажа) ──
  votes: {
    vote: (serverId: string, nickname: string) =>
      request<{ success: boolean; nickname: string }>(`/votes/${serverId}`, {
        method: 'POST',
        body: JSON.stringify({ nickname }),
      }),
    status: (serverId: string) =>
      request<VoteStatus>(`/votes/${serverId}/status`),
    summary: (serverId: string) =>
      request<VoteSummary>(`/votes/${serverId}/summary`),
  },

  openingReminders: {
    keys: (token: string) =>
      request<string[]>('/opening-reminders/keys', { headers: { Authorization: `Bearer ${token}` } }),
    due: (token: string) =>
      request<OpeningReminder[]>('/opening-reminders/due', { headers: { Authorization: `Bearer ${token}` } }),
    add: (data: { serverId: string; instanceId?: string | null }, token: string) =>
      request<OpeningReminder>('/opening-reminders', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    remove: (serverId: string, instanceId: string | null | undefined, token: string) => {
      const q = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
      return request<any>(`/opening-reminders/${serverId}${q}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    },
  },

  openingWaits: {
    wait: (data: { serverId: string; instanceId?: string | null }) =>
      request<OpeningWaitResult>('/opening-waits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    click: (data: { serverId: string; instanceId?: string | null }) =>
      request<OpeningClickResult>('/opening-waits/click', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    clickReport: (days: number, token: string) =>
      request<OpeningClickReport>(`/opening-waits/admin/clicks?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    status: (keys: string[]) => {
      const q = new URLSearchParams({ keys: keys.join(',') }).toString();
      return request<Record<string, boolean>>(`/opening-waits/status?${q}`);
    },
    top: (limit = 5) =>
      request<OpeningWaitTopItem[]>(`/opening-waits/top?limit=${limit}`),
  },
};
