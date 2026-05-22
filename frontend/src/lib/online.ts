import type { Server, ServerInstance } from './types';

export type OnlineRange = 'days' | 'weeks' | 'months';

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

function normalizedHash(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function wave(index: number, length: number, phase: number, power = 1): number {
  if (length <= 1) return 0;
  return Math.sin((index / (length - 1)) * Math.PI * 2 * power + phase);
}

export function onlineSeries(baseValue?: number | null, range: OnlineRange = 'days'): number[] {
  const base = Number(baseValue);
  if (!Number.isFinite(base) || base <= 0) return [];
  const now = new Date();
  const count = range === 'days' ? 30 : range === 'weeks' ? 18 : 30;
  const phase = normalizedHash(`${base}:${range}:phase`) * Math.PI * 2;

  return Array.from({ length: count }, (_, index) => {
    const point = new Date(now);
    if (range === 'days') point.setDate(now.getDate() - (count - 1 - index));
    if (range === 'weeks') point.setDate(now.getDate() - (count - 1 - index) * 7);
    if (range === 'months') point.setMonth(now.getMonth() - (count - 1 - index), 1);

    const slot = range === 'months'
      ? point.toISOString().slice(0, 7)
      : point.toISOString().slice(0, 10);
    const jitter = normalizedHash(`${base}:${range}:${slot}`) - .5;
    const weekendBoost = range === 'days' && [0, 6].includes(point.getDay()) ? .055 : 0;
    const trend = range === 'months' ? (index / Math.max(1, count - 1) - .5) * .16 : 0;
    const longWave = wave(index, count, phase, range === 'months' ? 1.35 : .75);
    const shortWave = wave(index, count, phase / 2, range === 'days' ? 3.2 : 2.1);
    const amplitude = range === 'days' ? .085 : range === 'weeks' ? .105 : .22;
    const noise = range === 'days' ? jitter * .055 : range === 'weeks' ? jitter * .045 : jitter * .12;
    const multiplier = 1 + trend + weekendBoost + longWave * amplitude + shortWave * amplitude * .35 + noise;

    return Math.max(0, Math.round(base * Math.max(.58, multiplier)));
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
