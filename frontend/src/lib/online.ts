import type { Server, ServerInstance } from './types';

export type OnlineRange = '24h' | '7d' | '30d';

export function instanceOnlineValue(instance?: ServerInstance | null): number | null {
  if (!instance) return null;
  if ((instance.onlineMode || 'off') === 'off') return null;
  const raw = instance.onlineMode === 'manual'
    ? instance.onlineManual
    : instance.onlineValue ?? instance.onlineManual;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function instanceOnlineIsEstimated(instance?: ServerInstance | null): boolean {
  return instanceOnlineValue(instance) != null && instance?.onlineMode === 'estimated';
}

export function serverOnlineValue(server?: Server | null): number | null {
  if (!server) return null;
  const instances = Array.isArray(server.instances) ? server.instances : [];
  if (instances.length > 0) {
    const values = instances
      .map(instanceOnlineValue)
      .filter((value): value is number => value != null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  }

  const value = Number(server.onlineValue);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function serverOnlineIsEstimated(server?: Server | null): boolean {
  if (!server) return false;
  const instances = Array.isArray(server.instances) ? server.instances : [];
  return instances.some(instanceOnlineIsEstimated);
}

export function formatOnline(value?: number | null, estimated = false): string {
  return value == null ? '-' : `${estimated ? '≈ ' : ''}${value.toLocaleString('ru-RU')}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function timeFactor(hour: number): number {
  if (hour >= 1 && hour < 7) return 0.42;
  if (hour >= 7 && hour < 12) return 0.62 + (hour - 7) * 0.04;
  if (hour >= 12 && hour < 18) return 0.82 + (hour - 12) * 0.02;
  if (hour >= 18 && hour < 23) return 0.98 + (hour - 18) * 0.015;
  return 0.78;
}

export function onlineSeries(baseValue?: number | null, range: OnlineRange = '24h'): number[] {
  const base = Number(baseValue);
  if (!Number.isFinite(base) || base <= 0) return [];
  const now = new Date();
  const count = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  return Array.from({ length: count }, (_, index) => {
    const point = new Date(now);
    if (range === '24h') point.setHours(now.getHours() - (count - 1 - index));
    else point.setDate(now.getDate() - (count - 1 - index));

    const moscowHour = (point.getUTCHours() + 3) % 24;
    const dayShape = range === '24h' ? timeFactor(moscowHour) : 0.82 + ((index % 7) / 6) * 0.18;
    const slot = range === '24h'
      ? point.toISOString().slice(0, 13)
      : point.toISOString().slice(0, 10);
    const jitter = 0.96 + (hashString(`${base}:${range}:${slot}`) / 0xffffffff) * 0.08;
    return Math.max(0, Math.round(base * dayShape * jitter));
  });
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
