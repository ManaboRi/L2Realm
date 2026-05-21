import type { Server, ServerInstance } from './types';

export function instanceOnlineValue(instance?: ServerInstance | null): number | null {
  if (!instance) return null;
  const raw = instance.onlineMode === 'manual'
    ? instance.onlineManual
    : instance.onlineValue ?? instance.onlineManual;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
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

export function formatOnline(value?: number | null): string {
  return value == null ? '—' : value.toLocaleString('ru-RU');
}
