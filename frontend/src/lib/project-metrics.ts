import type { Server, ServerInstance, TrafficSnapshot } from './types';
import { isOpeningStillSoon } from './opening';

export type WorldLifecycle = 'active' | 'upcoming' | 'merged' | 'closed' | 'archived';

export function worldLifecycle(instance: ServerInstance): WorldLifecycle {
  // Исторические состояния (объединён/закрыт/архив) выставляются явно и имеют приоритет.
  // «Открыт»/«Скоро» НЕ хранятся вручную — вычисляются из даты открытия, чтобы статус
  // переключался автоматически и не «залипал» на «Скоро» после открытия сервера.
  const status = instance.lifecycleStatus;
  if (status === 'merged' || status === 'closed' || status === 'archived') return status;
  return isOpeningStillSoon(instance.openedDate) ? 'upcoming' : 'active';
}

export function isHistoricalWorld(instance: ServerInstance): boolean {
  const status = worldLifecycle(instance);
  return status === 'merged' || status === 'closed' || status === 'archived';
}

export function currentProjectWorlds(server?: Server | null): ServerInstance[] {
  return (server?.instances ?? []).filter(instance => !isHistoricalWorld(instance));
}

export function historicalProjectWorlds(server?: Server | null): ServerInstance[] {
  return (server?.instances ?? []).filter(isHistoricalWorld);
}

export function projectWorldCount(server?: Server | null): number {
  if (!server) return 0;
  if ((server.instances?.length ?? 0) === 0) return 1;
  return currentProjectWorlds(server).length;
}

export function projectOpeningCount(server?: Server | null): number {
  if (!server) return 0;
  return Math.max(1, server.instances?.length ?? 0);
}

export function nextProjectOpening(server?: Server | null): string | null {
  if (!server) return null;
  const candidates = (server.instances?.length ? currentProjectWorlds(server).map(instance => instance.openedDate) : [server.openedDate])
    .filter((value): value is string => Boolean(value))
    .filter(value => isOpeningStillSoon(value))
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return candidates[0]?.toISOString() ?? null;
}

export function latestProjectOpening(server?: Server | null): string | null {
  if (!server) return null;
  const dates = (server.instances?.length ? server.instances.map(instance => instance.openedDate) : [server.openedDate])
    .filter((value): value is string => Boolean(value))
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()) && date.getTime() <= Date.now())
    .sort((left, right) => right.getTime() - left.getTime());
  return dates[0]?.toISOString() ?? null;
}

export function worldLifecycleLabel(instance: ServerInstance): string {
  const status = worldLifecycle(instance);
  if (status === 'upcoming') return 'Скоро';
  if (status === 'merged') return 'Объединён';
  if (status === 'closed') return 'Закрыт';
  if (status === 'archived') return 'Архив';
  return 'Открыт';
}

// Единый источник правды для подписи/цвета/пояснения «Активности» и «Доверия».
// Используется на карточках, странице проекта и в статьях, чтобы не расходились.
export interface BadgeMeta { label: string; color: string; title: string; known: boolean; }

export function activityMeta(level?: string | null): BadgeMeta {
  switch (level) {
    case 'high':     return { label: 'Высокая',      color: '#5fcf7a', known: true, title: 'Игроки часто встречаются в городах, локациях и на активностях.' };
    case 'medium':   return { label: 'Средняя',      color: '#d8c24e', known: true, title: 'Игроки есть, но активность заметна не во всех зонах.' };
    case 'low':      return { label: 'Низкая',       color: '#e0913f', known: true, title: 'Игроки встречаются редко, активность лучше перепроверять перед стартом.' };
    case 'very_low': return { label: 'Очень низкая', color: '#e25c4b', known: true, title: 'Во время проверки активность почти не была заметна.' };
    default:         return { label: 'Не указана',   color: 'rgba(232,221,186,.5)', known: false, title: 'Редакция ещё не выставила уровень активности.' };
  }
}

export function trustMeta(level?: string | null): BadgeMeta {
  switch (level) {
    case 'A': return { label: 'A', color: '#5fcf7a', known: true, title: 'Доверие A — проект проверен, серьёзных вопросов нет.' };
    case 'B': return { label: 'B', color: '#d8c24e', known: true, title: 'Доверие B — проверен, но есть мелкие вопросы.' };
    case 'C': return { label: 'C', color: '#e25c4b', known: true, title: 'Доверие C — доверие низкое, изучите внимательнее.' };
    default:  return { label: '—', color: 'rgba(232,221,186,.5)', known: false, title: 'Уровень доверия ещё не выставлен.' };
  }
}

export function formatTraffic(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  const amount = Number(value);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000).toLocaleString('ru-RU')} тыс.`;
  return amount.toLocaleString('ru-RU');
}

export function projectTrafficHistory(server?: Server | null): TrafficSnapshot[] {
  const history = Array.isArray(server?.trafficHistory) ? server.trafficHistory : [];
  const snapshots = history
    .filter(snapshot => /^\d{4}-(0[1-9]|1[0-2])$/.test(snapshot.period))
    .filter(snapshot => snapshot.monthly != null || snapshot.threeMonths != null)
    .sort((left, right) => left.period.localeCompare(right.period));

  if (snapshots.length > 0) return snapshots;
  if (!server?.trafficPeriod || (server.trafficMonthly == null && server.trafficThreeMonths == null)) return [];

  return [{
    period: server.trafficPeriod,
    monthly: server.trafficMonthly ?? null,
    threeMonths: server.trafficThreeMonths ?? null,
    source: server.trafficSource ?? null,
  }];
}

export function projectTrafficTrend(server?: Server | null): { direction: 'up' | 'down' | 'flat'; percent: number } | null {
  const snapshots = projectTrafficHistory(server)
    .filter(snapshot => snapshot.threeMonths != null && Number(snapshot.threeMonths) > 0);
  if (snapshots.length < 2) return null;

  const previous = Number(snapshots[snapshots.length - 2].threeMonths);
  const current = Number(snapshots[snapshots.length - 1].threeMonths);
  const percent = Math.round(Math.abs(((current - previous) / previous) * 100));
  if (current === previous) return { direction: 'flat', percent: 0 };
  return { direction: current > previous ? 'up' : 'down', percent };
}

export function formatTrafficPeriod(period?: string | null): string {
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return '-';
  const date = new Date(`${period}-01T00:00:00Z`);
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '');
}
