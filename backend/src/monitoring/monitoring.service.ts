import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as https from 'https';
import * as http  from 'http';

const MONITOR_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const MONITOR_CONCURRENCY = 5;

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private prisma: PrismaService) {}

  // ── Получить статус сервера ──────────────────
  async getStatus(serverId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return null;
    const manualStatus = normalizeStatusOverride((server as any).statusOverride);

    const last = await this.prisma.monitorLog.findFirst({
      where: { serverId },
      orderBy: { checkedAt: 'desc' },
    });

    if (manualStatus) {
      return {
        serverId,
        status: manualStatus,
        last,
        uptime: manualUptime(manualStatus),
        history: [],
        manual: true,
      };
    }

    const history = await this.prisma.monitorLog.findMany({
      where: { serverId },
      orderBy: { checkedAt: 'desc' },
      take: 24,
    });

    return {
      serverId,
      status:  server.status,
      last,
      uptime:  this.calcUptime(history),
      history: history.reverse(),
    };
  }

  // ── Проверить один сервер ────────────────────
  async checkServer(serverId: string): Promise<boolean> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return false;

    const manualStatus = normalizeStatusOverride((server as any).statusOverride);
    if (manualStatus) {
      await this.prisma.server.update({
        where: { id: serverId },
        data:  { status: manualStatus },
      });
      return manualStatus === 'online';
    }

    const url       = server.url || server.site;
    const start     = Date.now();
    const reachable = await this.pingUrl(url);
    const ping      = Date.now() - start;

    await this.prisma.monitorLog.create({
      data: { serverId, online: reachable, ping: reachable ? ping : null },
    });

    await this.prisma.server.update({
      where: { id: serverId },
      data:  {
        status: reachable ? 'online' : 'offline',
      },
    });

    if (!reachable) {
      this.logger.warn(`OFFLINE: сервер ${serverId} недоступен`);
    }

    return reachable;
  }

  // ── Авто-проверка каждые 30 минут ───────────
  @Cron('*/30 * * * *')
  async checkAllServers() {
    const servers = await this.prisma.server.findMany({ select: { id: true } });
    this.logger.log(`Мониторинг: проверяем ${servers.length} серверов, параллельность ${MONITOR_CONCURRENCY}`);

    await mapWithConcurrency(servers, MONITOR_CONCURRENCY, async s => {
      try { await this.checkServer(s.id); } catch {}
    });
  }

  // ── Сброс истёкших тарифов — раз в час ──────
  @Cron(CronExpression.EVERY_HOUR)
  async resetExpiredSubscriptions() {
    const now     = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: { plan: { not: 'FREE' }, endDate: { lt: now } },
    });

    for (const sub of expired) {
      const freeEnd = new Date();
      freeEnd.setFullYear(freeEnd.getFullYear() + 1);

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data:  { plan: 'FREE', paid: false, endDate: freeEnd },
      });
      await this.prisma.server.update({
        where: { id: sub.serverId },
        data:  { vip: false },
      });

      this.logger.log(`Тариф сервера ${sub.serverId} сброшен на FREE (истёк ${sub.endDate.toISOString()})`);
    }

    if (expired.length > 0) {
      this.logger.log(`Сброшено истёкших тарифов: ${expired.length}`);
    }
  }

  // ── Статистика аптайма за N дней ────────────
  async getUptimeStats(serverId: string, days = 7) {
    const manualStatus = await this.getManualStatus(serverId);
    if (manualStatus) {
      const uptime = manualUptime(manualStatus);
      return {
        total: uptime == null ? 0 : 1,
        online: manualStatus === 'online' ? 1 : 0,
        offline: manualStatus === 'offline' ? 1 : 0,
        uptime,
        logs: [],
        manual: true,
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.monitorLog.findMany({
      where: { serverId, checkedAt: { gte: since } },
      orderBy: { checkedAt: 'asc' },
    });

    return {
      total:   logs.length,
      online:  logs.filter(l => l.online).length,
      offline: logs.filter(l => !l.online).length,
      uptime:  this.calcUptime(logs),
      logs,
    };
  }

  // ── Дневная статистика для графика ──────────
  async getDailyStats(serverId: string, days = 30) {
    const manualStatus = await this.getManualStatus(serverId);
    if (manualStatus) {
      return buildManualDailyStats(manualStatus, days);
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await this.prisma.monitorLog.findMany({
      where: { serverId, checkedAt: { gte: since } },
      orderBy: { checkedAt: 'asc' },
    });

    // Группируем по дням
    const byDay: Record<string, { online: number; total: number; pings: number[] }> = {};
    for (const log of logs) {
      const day = log.checkedAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { online: 0, total: 0, pings: [] };
      byDay[day].total++;
      if (log.online) byDay[day].online++;
      if (log.ping)   byDay[day].pings.push(log.ping);
    }

    // Массив из N дней (включая дни без данных)
    const today  = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = byDay[key];
      result.push({
        date:    key,
        uptime:  day ? Math.round((day.online / day.total) * 100) : null,
        avgPing: day?.pings.length
          ? Math.round(day.pings.reduce((a, b) => a + b, 0) / day.pings.length)
          : null,
        total: day?.total ?? 0,
      });
    }

    // Общие метрики за период
    const allPings    = logs.filter(l => l.ping != null).map(l => l.ping as number);
    const avgResponse = allPings.length
      ? Math.round(allPings.reduce((a, b) => a + b, 0) / allPings.length)
      : null;
    const uptime30 = logs.length
      ? Math.round((logs.filter(l => l.online).length / logs.length) * 100)
      : null;

    return { days: result, uptime30, avgResponse };
  }

  // ── Утилиты ──────────────────────────────────
  private calcUptime(logs: { online: boolean }[]): number {
    if (!logs.length) return 0;
    return Math.round((logs.filter(l => l.online).length / logs.length) * 100);
  }

  private async getManualStatus(serverId: string): Promise<'online' | 'offline' | 'unknown' | null> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { statusOverride: true },
    });
    return normalizeStatusOverride((server as any)?.statusOverride);
  }

  private pingUrl(url: string): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const parsed = new URL(url);
        const mod    = parsed.protocol === 'https:' ? https : http;
        const req    = mod.get({
          hostname: parsed.hostname,
          port:     parsed.port || undefined,
          path:     (parsed.pathname || '/') + (parsed.search || ''),
          timeout:  7000,
          headers: {
            // Полноценный браузерный UA — Cloudflare/anti-bot пропускают; identifier-style
            // («compatible; L2RealmMonitor») блокировался у E-Global и подобных.
            'User-Agent':      MONITOR_UA,
            'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Dest':  'document',
            'Sec-Fetch-Mode':  'navigate',
            'Sec-Fetch-Site':  'none',
          },
        }, res => {
          const code = res.statusCode ?? 0;
          // 2xx/3xx/4xx = сервер отвечает; 5xx = реально упал
          resolve(code > 0 && code < 500);
          res.destroy();
        });
        req.on('error',   () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      } catch {
        resolve(false);
      }
    });
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(runners);
  return results;
}

function normalizeStatusOverride(value?: string | null): 'online' | 'offline' | 'unknown' | null {
  if (value === 'online' || value === 'offline' || value === 'unknown') return value;
  return null;
}

function manualUptime(status: 'online' | 'offline' | 'unknown'): number | null {
  if (status === 'online') return 100;
  if (status === 'offline') return 0;
  return null;
}

function buildManualDailyStats(status: 'online' | 'offline' | 'unknown', days: number) {
  const uptime = manualUptime(status);
  const today = new Date();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().slice(0, 10),
      uptime,
      avgPing: null,
      total: uptime == null ? 0 : 1,
    });
  }
  return { days: result, uptime30: uptime, avgResponse: null, manual: true };
}
