import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as https from 'https';
import * as http  from 'http';
import axios from 'axios';

type OnlineParseResult = {
  players: number | null;
  status: 'disabled' | 'ok' | 'not_found' | 'error';
};

const MONITOR_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private prisma: PrismaService) {}

  // ── Получить статус сервера ──────────────────
  async getStatus(serverId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return null;

    const last = await this.prisma.monitorLog.findFirst({
      where: { serverId },
      orderBy: { checkedAt: 'desc' },
    });

    const history = await this.prisma.monitorLog.findMany({
      where: { serverId },
      orderBy: { checkedAt: 'desc' },
      take: 24,
    });

    return {
      serverId,
      status:  server.status,
      online:  server.online,
      onlineSourceUrl: server.onlineSourceUrl,
      onlineSourceStatus: server.onlineSourceStatus,
      onlineUpdatedAt: server.onlineUpdatedAt,
      last,
      uptime:  this.calcUptime(history),
      history: history.reverse(),
    };
  }

  // ── Проверить один сервер ────────────────────
  async checkServer(serverId: string): Promise<boolean> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return false;

    const url       = server.url || server.site;
    const start     = Date.now();
    const reachable = await this.pingUrl(url);
    const ping      = Date.now() - start;
    const checkedAt = new Date();

    const instances = Array.isArray(server.instances) ? server.instances as any[] : [];
    const parsedProject = await this.readOnline(server.onlineSourceUrl);
    const parsedInstances = await Promise.all(instances.map(async inst => {
      if (!inst?.onlineSourceUrl) return { ...inst, onlineSourceStatus: inst?.onlineSourceStatus ?? 'disabled' };
      const parsed = await this.readOnline(inst.onlineSourceUrl);
      return {
        ...inst,
        online:             parsed.players,
        onlineUpdatedAt:     parsed.status === 'ok' ? checkedAt.toISOString() : inst.onlineUpdatedAt ?? null,
        onlineSourceStatus:  parsed.status,
      };
    }));

    const instanceOnlineValues = parsedInstances
      .map(inst => typeof inst.online === 'number' ? inst.online : null)
      .filter((n): n is number => n != null);
    const summedInstancesOnline = instanceOnlineValues.length
      ? instanceOnlineValues.reduce((sum, n) => sum + n, 0)
      : null;
    const projectPlayers = parsedProject.status === 'ok'
      ? parsedProject.players
      : summedInstancesOnline;
    const projectSourceStatus = server.onlineSourceUrl
      ? parsedProject.status
      : summedInstancesOnline != null ? 'ok' : 'disabled';

    await this.prisma.monitorLog.create({
      data: { serverId, online: reachable, ping: reachable ? ping : null, players: projectPlayers },
    });

    await this.prisma.server.update({
      where: { id: serverId },
      data:  {
        status: reachable ? 'online' : 'offline',
        online: projectPlayers,
        onlineSourceStatus: projectSourceStatus,
        onlineUpdatedAt: projectPlayers != null ? checkedAt : server.onlineUpdatedAt,
        instances: parsedInstances,
      },
    });

    if (!reachable) {
      this.logger.warn(`OFFLINE: сервер ${serverId} недоступен`);
    }

    return reachable;
  }

  // ── Авто-проверка каждые 5 минут ────────────
  @Cron('*/5 * * * *')
  async checkAllServers() {
    const servers = await this.prisma.server.findMany({ select: { id: true } });
    this.logger.log(`Мониторинг: проверяем ${servers.length} серверов`);

    for (const s of servers) {
      try { await this.checkServer(s.id); } catch {}
    }
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

  private async readOnline(url?: string | null): Promise<OnlineParseResult> {
    if (!url?.trim()) return { players: null, status: 'disabled' };
    try {
      const html = await this.fetchText(url.trim());
      const players = this.extractOnlinePlayers(html);
      return players == null
        ? { players: null, status: 'not_found' }
        : { players, status: 'ok' };
    } catch {
      return { players: null, status: 'error' };
    }
  }

  private async fetchText(url: string): Promise<string> {
    const { data } = await axios.get<string>(url, {
      responseType: 'text',
      timeout: 10_000,
      maxContentLength: 600_000,
      headers: {
        'User-Agent':      MONITOR_UA,
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
      validateStatus: status => status > 0 && status < 500,
    });
    return String(data).slice(0, 600_000);
  }

  private extractOnlinePlayers(html: string): number | null {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const patterns = [
      /["']?(?:online|players|player_count|online_players)["']?\s*[:=]\s*["']?([0-9][0-9\s.,]{0,10})/i,
      /(?:онлайн|online|players?|игрок(?:ов|и|а)?|играют|в игре|сейчас онлайн)\D{0,50}([0-9][0-9\s.,]{0,10})/i,
      /([0-9][0-9\s.,]{0,10})\D{0,35}(?:онлайн|online|players?|игрок(?:ов|и|а)?|играют|в игре)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const count = match ? parsePlayerCount(match[1]) : null;
      if (count != null) return count;
    }
    return null;
  }

  // Многие сайты на Cloudflare/anti-bot блокируют запросы без UA — классифицируем
  // их как offline. Отдаём обычный браузерный UA и идём по исходному пути URL.
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

function parsePlayerCount(raw: string): number | null {
  const compact = raw.replace(/\s/g, '').trim();
  const normalized = compact.replace(/[.,](?=\d{3}\b)/g, '').replace(/[^\d]/g, '');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isInteger(value) || value < 0 || value > 200_000) return null;
  return value;
}
