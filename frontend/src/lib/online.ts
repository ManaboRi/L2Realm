import type { Server, ServerInstance } from './types';
import { currentProjectWorlds, projectWorldCount } from './project-metrics';

export type OnlineRange = 'hours' | 'days' | 'monthDays' | 'weeks' | 'months';
export type OnlineHistoryEntry = { at: string; value: number; estimated?: boolean };

function instanceOnlineReferenceValue(instance?: ServerInstance | null): number | null {
  if (!instance) return null;
  if ((instance.onlineMode || 'off') === 'off') return null;
  const raw = instance.onlineMode === 'manual'
    ? instance.onlineManual
    : instance.onlineValue ?? instance.onlineManual;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function instanceOnlineValue(instance?: ServerInstance | null): number | null {
  return instanceOnlineReferenceValue(instance);
}

export function instanceOnlineIsEstimated(instance?: ServerInstance | null): boolean {
  return instanceOnlineValue(instance) != null && instance?.onlineMode === 'estimated';
}

export function serverOnlineValue(server?: Server | null): number | null {
  if (!server) return null;
  const instances = Array.isArray(server.instances) ? server.instances : [];
  if (instances.length > 0) {
    const values = currentProjectWorlds(server)
      .map(instanceOnlineValue)
      .filter((value): value is number => value != null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  }

  const value = Number(server.onlineValue);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function serverOnlineIsEstimated(server?: Server | null): boolean {
  if (!server) return false;
  const instances = currentProjectWorlds(server);
  return instances.some(instanceOnlineIsEstimated);
}

export function formatOnline(value?: number | null, estimated = false): string {
  return value == null ? '-' : `${estimated ? '≈ ' : ''}${value.toLocaleString('ru-RU')}`;
}

export function serverOnlineDisclosure(server?: Server | null) {
  const instances = currentProjectWorlds(server);
  if (!server || instances.length === 0) return null;
  const tracked = instances.filter(instance => instanceOnlineValue(instance) != null);
  if (tracked.length === 0) return null;
  const modes = new Set(tracked.map(instance => instance.onlineMode || 'off'));
  const hasEstimate = modes.has('estimated');
  const hasSiteValue = modes.has('next-json') || modes.has('html-json-var') || modes.has('html-regex');
  let label = 'Указан вручную';
  let title = 'Значение добавлено редакцией вручную.';

  if (hasEstimate && hasSiteValue) {
    label = 'Сайт + оценка';
    title = 'Часть данных получена с сайта проекта, часть рассчитана L2Realm с учетом времени суток и хроник.';
  } else if (hasEstimate) {
    label = 'Оценка L2Realm';
    title = 'Оценочное значение L2Realm: визуальная проверка редакции и умная суточная модель, а не подтвержденный счетчик игроков.';
  } else if (hasSiteValue) {
    label = 'С сайта проекта';
    title = 'Показатель получен с сайта проекта и может зависеть от его методики подсчета.';
  }

  const worlds = projectWorldCount(server);
  if (tracked.length < worlds) title += ` Учитывается ${tracked.length} из ${worlds} миров.`;
  return { label, title, tracked: tracked.length, worlds, estimated: hasEstimate };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedHash(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function wave(index: number, length: number, phase: number, power = 1): number {
  if (length <= 1) return 0;
  return Math.sin((index / (length - 1)) * Math.PI * 2 * power + phase);
}

const ESTIMATED_DAILY_CURVE = [
  { hour: 0, multiplier: .42 },
  { hour: 2, multiplier: .30 },
  { hour: 4, multiplier: .20 },
  { hour: 6, multiplier: .22 },
  { hour: 8, multiplier: .50 },
  { hour: 10, multiplier: .68 },
  { hour: 12, multiplier: .72 },
  { hour: 14, multiplier: .74 },
  { hour: 16, multiplier: .85 },
  { hour: 18, multiplier: .95 },
  { hour: 20, multiplier: 1 },
  { hour: 22, multiplier: .83 },
  { hour: 24, multiplier: .55 },
] as const;

function moscowClock(date: Date) {
  const moscow = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return {
    day: moscow.getUTCDay(),
    hour: moscow.getUTCHours() + moscow.getUTCMinutes() / 60,
    slot: moscow.toISOString().slice(0, 13),
  };
}

function interpolatedDailyMultiplier(hour: number): number {
  const normalizedHour = ((hour % 24) + 24) % 24;
  for (let index = 1; index < ESTIMATED_DAILY_CURVE.length; index++) {
    const previous = ESTIMATED_DAILY_CURVE[index - 1];
    const next = ESTIMATED_DAILY_CURVE[index];
    if (normalizedHour <= next.hour) {
      const progress = (normalizedHour - previous.hour) / (next.hour - previous.hour);
      return previous.multiplier + ((next.multiplier - previous.multiplier) * progress);
    }
  }
  return ESTIMATED_DAILY_CURVE[0].multiplier;
}

function chronicleMultiplier(multiplier: number, chronicle?: string): number {
  const value = String(chronicle || '').toLowerCase();
  if (value.includes('essence') || value.includes('main')) return .67 + (multiplier * .33);
  if (value.includes('classic')) return .3 + (multiplier * .7);
  return multiplier;
}

function weekdayMultiplier(day: number, hour: number): number {
  if (day === 5) return hour >= 16 ? 1.15 : 1.04;
  if (day === 6) return hour >= 12 ? 1.32 : 1.25;
  if (day === 0) return hour >= 22 ? 1.1 : 1.2;
  return 1;
}

function estimatedMultiplier(date: Date, instance: ServerInstance): number {
  const clock = moscowClock(date);
  const daily = chronicleMultiplier(interpolatedDailyMultiplier(clock.hour), instance.chronicle);
  const weekday = weekdayMultiplier(clock.day, clock.hour);
  const noiseSeed = `${instance.id}:${instance.chronicle}:${clock.slot}`;
  const magnitude = .05 + (normalizedHash(`${noiseSeed}:magnitude`) * .1);
  const direction = normalizedHash(`${noiseSeed}:direction`) >= .5 ? 1 : -1;
  return Math.max(.12, daily * weekday * (1 + (magnitude * direction)));
}

function estimatedOnlineAt(instance: ServerInstance, at: Date, reference = instanceOnlineReferenceValue(instance)): number | null {
  if (reference == null) return null;
  const enteredValue = Number(instance.onlineManual);
  const explicitObservation = instance.onlineEstimatedAt ? new Date(instance.onlineEstimatedAt) : null;
  const latestSnapshot = instance.onlineUpdatedAt ? new Date(instance.onlineUpdatedAt) : null;
  const hasExplicitObservation = explicitObservation != null && !Number.isNaN(explicitObservation.getTime());
  const hasLatestSnapshot = latestSnapshot != null && !Number.isNaN(latestSnapshot.getTime());
  const base = hasExplicitObservation && Number.isFinite(enteredValue) && enteredValue >= 0 ? enteredValue : reference;
  const anchorAt = hasExplicitObservation ? explicitObservation : hasLatestSnapshot ? latestSnapshot : null;
  const anchor = anchorAt ? estimatedMultiplier(anchorAt, instance) : 1;
  return Math.max(0, Math.round(base * estimatedMultiplier(at, instance) / Math.max(.1, anchor)));
}

function rangePointDate(now: Date, range: OnlineRange, count: number, index: number) {
  const point = new Date(now);
  if (range === 'hours') point.setHours(now.getHours() - (count - 1 - index));
  if (range === 'days' || range === 'monthDays') point.setDate(now.getDate() - (count - 1 - index));
  if (range === 'weeks') point.setDate(now.getDate() - (count - 1 - index) * 7);
  if (range === 'months') point.setMonth(now.getMonth() - (count - 1 - index), 1);
  return point;
}

function estimatedOnlineSeries(instance: ServerInstance, range: OnlineRange, count: number): number[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => estimatedOnlineAt(instance, rangePointDate(now, range, count, index)) ?? 0);
}

export function onlineSeries(baseValue?: number | null, range: OnlineRange = 'days'): number[] {
  const base = Number(baseValue);
  if (!Number.isFinite(base) || base <= 0) return [];
  const now = new Date();
  const count = range === 'hours' ? 24 : range === 'days' ? 7 : range === 'monthDays' ? 30 : range === 'weeks' ? 18 : 30;
  const phase = normalizedHash(`${base}:${range}:phase`) * Math.PI * 2;

  return Array.from({ length: count }, (_, index) => {
    const point = rangePointDate(now, range, count, index);

    const slot = range === 'hours'
      ? point.toISOString().slice(0, 13)
      : range === 'months'
      ? point.toISOString().slice(0, 7)
      : point.toISOString().slice(0, 10);
    const jitter = normalizedHash(`${base}:${range}:${slot}`) - .5;
    const weekendBoost = (range === 'days' || range === 'monthDays') && [0, 6].includes(point.getDay()) ? .055 : 0;
    const trend = range === 'months' ? (index / Math.max(1, count - 1) - .5) * .16 : 0;
    const longWave = wave(index, count, phase, range === 'months' ? 1.35 : .75);
    const shortWave = wave(index, count, phase / 2, range === 'hours' ? 2.7 : range === 'days' || range === 'monthDays' ? 3.2 : 2.1);
    const amplitude = range === 'hours' ? .18 : range === 'days' || range === 'monthDays' ? .085 : range === 'weeks' ? .105 : .22;
    const noise = range === 'hours' ? jitter * .045 : range === 'days' || range === 'monthDays' ? jitter * .055 : range === 'weeks' ? jitter * .045 : jitter * .12;
    const multiplier = 1 + trend + weekendBoost + longWave * amplitude + shortWave * amplitude * .35 + noise;

    return Math.max(0, Math.round(base * Math.max(.58, multiplier)));
  });
}

function historyBucketIndex(date: Date, now: Date, range: OnlineRange): number {
  if (range === 'hours') {
    return Math.floor((now.getTime() - date.getTime()) / 3600000);
  }
  if (range === 'months') {
    return (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((today - day) / 86400000);
  return range === 'weeks' ? Math.floor(diffDays / 7) : diffDays;
}

function historyValues(history: OnlineHistoryEntry[] | null | undefined, range: OnlineRange, count: number): Array<number | null> {
  const values: Array<number | null> = Array(count).fill(null);
  if (!Array.isArray(history)) return values;

  const now = new Date();
  for (const point of history) {
    const value = Number(point?.value);
    const at = new Date(point?.at);
    if (!Number.isFinite(value) || Number.isNaN(at.getTime())) continue;
    const bucketAge = historyBucketIndex(at, now, range);
    const index = count - 1 - bucketAge;
    if (index < 0 || index >= count) continue;
    values[index] = values[index] == null ? Math.round(value) : Math.max(values[index] ?? 0, Math.round(value));
  }

  return values;
}

export function serverOnlineHistorySeries(server: Server | null | undefined, range: OnlineRange, fallback: number[]) {
  const count = fallback.length;
  if (!server || count === 0) return { values: fallback, realPoints: 0 };

  const sources = Array.isArray(server.instances) && server.instances.length > 0
    ? currentProjectWorlds(server)
    : [server as unknown as ServerInstance];
  const estimatedSources = sources.filter(source => source.onlineMode === 'estimated' && instanceOnlineReferenceValue(source) != null);
  if (estimatedSources.length > 0) {
    const sums = Array<number>(count).fill(0);
    let hasSource = false;
    let realPoints = 0;
    for (const source of sources) {
      if (source.onlineMode === 'estimated' && instanceOnlineReferenceValue(source) != null) {
        estimatedOnlineSeries(source, range, count).forEach((value, index) => { sums[index] += value; });
        hasSource = true;
        continue;
      }
      const current = instanceOnlineValue(source);
      if (current == null) continue;
      const values = historyValues(source.onlineHistory, range, count);
      const points = values.filter(value => value != null).length;
      realPoints += points;
      const fallbackValues = onlineSeries(current, range);
      const resolved = points >= 3 ? values.map((value, index) => value ?? fallbackValues[index] ?? 0) : fallbackValues;
      resolved.forEach((value, index) => { sums[index] += value; });
      hasSource = true;
    }
    return { values: hasSource ? sums : fallback, realPoints };
  }
  const sums: Array<number | null> = Array(count).fill(null);

  for (const source of sources) {
    const values = historyValues(source.onlineHistory, range, count);
    values.forEach((value, index) => {
      if (value == null) return;
      sums[index] = (sums[index] ?? 0) + value;
    });
  }

  const realPoints = sums.filter(value => value != null).length;
  return {
    values: realPoints >= 3 ? sums.map((value, index) => value ?? fallback[index] ?? 0) : fallback,
    realPoints,
  };
}

export function serverOnlineLast24Hours(server?: Server | null): number[] {
  if (!server) return [];
  const sources = Array.isArray(server.instances) && server.instances.length > 0
    ? currentProjectWorlds(server)
    : [server as unknown as ServerInstance];
  const estimatedSources = sources.filter(source => source.onlineMode === 'estimated' && instanceOnlineReferenceValue(source) != null);
  if (estimatedSources.length > 0) {
    const totals = Array<number>(24).fill(0);
    for (const source of sources) {
      if (source.onlineMode === 'estimated' && instanceOnlineReferenceValue(source) != null) {
        estimatedOnlineSeries(source, 'hours', 24).forEach((value, index) => { totals[index] += value; });
        continue;
      }
      const current = instanceOnlineValue(source);
      if (current == null) continue;
      const values = historyValues(source.onlineHistory, 'hours', 24);
      const fallbackValues = onlineSeries(current, 'hours');
      const resolved = values.filter(value => value != null).length >= 3
        ? values.map((value, index) => value ?? fallbackValues[index] ?? 0)
        : fallbackValues;
      resolved.forEach((value, index) => { totals[index] += value; });
    }
    return totals;
  }
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  const buckets = new Map<number, number>();

  for (const source of sources) {
    for (const point of source.onlineHistory ?? []) {
      const at = new Date(point.at).getTime();
      const value = Number(point.value);
      if (!Number.isFinite(at) || at < cutoff || !Number.isFinite(value)) continue;
      const hour = Math.floor(at / 3600000);
      buckets.set(hour, (buckets.get(hour) ?? 0) + Math.round(value));
    }
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([, value]) => value);
}

export function instanceOnlineLast24Hours(instance?: ServerInstance | null): number[] {
  if (!instance) return [];
  if (instance.onlineMode === 'estimated' && instanceOnlineReferenceValue(instance) != null) {
    return estimatedOnlineSeries(instance, 'hours', 24);
  }
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  return (instance.onlineHistory ?? [])
    .map(point => ({ at: new Date(point.at).getTime(), value: Number(point.value) }))
    .filter(point => Number.isFinite(point.at) && point.at >= cutoff && Number.isFinite(point.value))
    .sort((left, right) => left.at - right.at)
    .map(point => Math.round(point.value));
}

export function onlineSeriesStats(values: number[]) {
  if (values.length === 0) return { current: null, average: null, peak: null };
  const current = values[values.length - 1];
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const peak = Math.max(...values);
  return { current, average, peak };
}

export function onlineChartPath(values: number[], width = 220, height = 62): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 8) - 4;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}
