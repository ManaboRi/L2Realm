import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_KEYS_PER_REQUEST = 120;
const CLICK_REPORT_LIMIT = 100;

function normalizeInstanceId(value?: string | null) {
  return String(value ?? '').trim();
}

function waitKey(serverId: string, instanceId?: string | null) {
  const cleanInstanceId = normalizeInstanceId(instanceId);
  return cleanInstanceId ? `${serverId}::${cleanInstanceId}` : serverId;
}

function weekKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function hashIp(ip: string) {
  const secret = process.env.OPENING_WAIT_SECRET || process.env.JWT_SECRET || 'l2realm-opening-wait-local';
  return createHash('sha256').update(`${secret}:${String(ip || '0.0.0.0').trim().toLowerCase()}`).digest('hex');
}

function isFutureOpening(value?: Date | string | null) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  return !Number.isNaN(ts) && ts > Date.now();
}

function openingDateFor(server: any, instanceId: string) {
  if (!instanceId) return server.openedDate ? new Date(server.openedDate) : null;
  const instances = Array.isArray(server.instances) ? server.instances as any[] : [];
  const instance = instances.find(item => item?.id === instanceId);
  if (!instance) throw new NotFoundException('Opening not found');
  return instance.openedDate ? new Date(instance.openedDate) : null;
}

function cleanText(value: unknown, max = 300) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

function normalizeTargetUrl(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new BadRequestException('Project site URL is not configured');
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
    return url.toString();
  } catch {
    throw new BadRequestException('Project site URL is invalid');
  }
}

function targetUrlFor(server: any, instanceId: string) {
  if (instanceId) {
    const instances = Array.isArray(server.instances) ? server.instances as any[] : [];
    const instance = instances.find(item => item?.id === instanceId);
    if (!instance) throw new NotFoundException('Opening not found');
    return normalizeTargetUrl(instance.url || server.url);
  }
  return normalizeTargetUrl(server.url);
}

@Injectable()
export class OpeningWaitsService {
  constructor(private prisma: PrismaService) {}

  async wait(serverId: string, instanceId: string | null | undefined, ip: string) {
    const cleanInstanceId = normalizeInstanceId(instanceId);
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');

    const openingAt = openingDateFor(server, cleanInstanceId);
    if (!isFutureOpening(openingAt)) {
      throw new BadRequestException('Opening date is not in the future');
    }

    const currentWeek = weekKey();
    const ipHash = hashIp(ip);
    let counted = true;

    try {
      await this.prisma.openingWait.create({
        data: { serverId, instanceId: cleanInstanceId, ipHash, weekKey: currentWeek },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') counted = false;
      else throw error;
    }

    const count = await this.prisma.openingWait.count({
      where: { serverId, instanceId: cleanInstanceId, weekKey: currentWeek },
    });

    return {
      ok: true,
      counted,
      key: waitKey(serverId, cleanInstanceId),
      count,
      weekKey: currentWeek,
    };
  }

  async status(rawKeys: string | string[] | undefined, ip: string) {
    const keys = parseKeys(rawKeys);
    if (keys.length === 0) return {};

    const rows = await this.prisma.openingWait.findMany({
      where: { ipHash: hashIp(ip), weekKey: weekKey() },
      select: { serverId: true, instanceId: true },
      take: MAX_KEYS_PER_REQUEST,
    });

    const waited = new Set(rows.map(row => waitKey(row.serverId, row.instanceId || null)));
    return keys.reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = waited.has(key);
      return acc;
    }, {});
  }

  async top(limit = 5) {
    const take = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 20) : 5;
    const currentWeek = weekKey();
    const groups = await this.prisma.openingWait.groupBy({
      by: ['serverId', 'instanceId'],
      where: { weekKey: currentWeek },
      _count: { id: true },
      orderBy: [{ _count: { id: 'desc' } }],
      take,
    });

    const serverIds = [...new Set(groups.map(group => group.serverId))];
    const servers = await this.prisma.server.findMany({
      where: { id: { in: serverIds } },
      select: { id: true, name: true, icon: true, abbr: true, chronicle: true, rates: true, openedDate: true, instances: true },
    });
    const byId = new Map(servers.map(server => [server.id, server]));

    return groups.map((group, index) => {
      const server = byId.get(group.serverId);
      const instanceId = group.instanceId || '';
      const instance = instanceId && Array.isArray(server?.instances)
        ? (server!.instances as any[]).find(item => item?.id === instanceId)
        : null;

      return {
        place: index + 1,
        key: waitKey(group.serverId, instanceId),
        serverId: group.serverId,
        instanceId: instanceId || null,
        count: group._count.id,
        server: server ? {
          id: server.id,
          name: server.name,
          icon: server.icon,
          abbr: server.abbr,
          chronicle: instance?.chronicle || server.chronicle,
          rates: instance?.rates || server.rates,
          openedDate: instance?.openedDate || server.openedDate,
          label: instance?.label || null,
        } : null,
      };
    }).filter(item => item.server);
  }

  async click(
    serverId: string,
    instanceId: string | null | undefined,
    ip: string,
    userAgent?: string | string[],
    referer?: string | string[],
  ) {
    const cleanServerId = String(serverId || '').trim();
    if (!cleanServerId) throw new BadRequestException('Server id is required');

    const cleanInstanceId = normalizeInstanceId(instanceId);
    const server = await this.prisma.server.findUnique({
      where: { id: cleanServerId },
      select: { id: true, url: true, instances: true },
    });
    if (!server) throw new NotFoundException('Server not found');

    const targetUrl = targetUrlFor(server, cleanInstanceId);
    await this.prisma.openingClick.create({
      data: {
        serverId: cleanServerId,
        instanceId: cleanInstanceId,
        ipHash: hashIp(ip),
        userAgent: cleanText(Array.isArray(userAgent) ? userAgent[0] : userAgent, 300),
        referer: cleanText(Array.isArray(referer) ? referer[0] : referer, 500),
        targetUrl,
      },
    });

    return { ok: true, url: targetUrl };
  }

  async clickReport(days = 30) {
    const cleanDays = Number.isFinite(Number(days)) ? Math.min(Math.max(Number(days), 1), 365) : 30;
    const since = new Date(Date.now() - cleanDays * 86_400_000);

    const groups = await this.prisma.openingClick.groupBy({
      by: ['serverId', 'instanceId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { id: 'desc' } }, { _max: { createdAt: 'desc' } }],
      take: CLICK_REPORT_LIMIT,
    });

    const serverIds = [...new Set(groups.map(group => group.serverId))];
    const servers = await this.prisma.server.findMany({
      where: { id: { in: serverIds } },
      select: { id: true, name: true, icon: true, abbr: true, chronicle: true, rates: true, url: true, instances: true },
    });
    const byId = new Map(servers.map(server => [server.id, server]));

    const items = groups.map(group => {
      const server = byId.get(group.serverId);
      const instanceId = group.instanceId || '';
      const instance = instanceId && Array.isArray(server?.instances)
        ? (server!.instances as any[]).find(item => item?.id === instanceId)
        : null;
      let targetUrl: string | null = null;
      if (server) {
        try {
          targetUrl = targetUrlFor(server, instanceId);
        } catch {
          targetUrl = null;
        }
      }

      return {
        key: waitKey(group.serverId, instanceId),
        serverId: group.serverId,
        instanceId: instanceId || null,
        count: group._count.id,
        lastClickAt: group._max.createdAt,
        targetUrl,
        server: server ? {
          id: server.id,
          name: server.name,
          icon: server.icon,
          abbr: server.abbr,
          chronicle: instance?.chronicle || server.chronicle,
          rates: instance?.rates || server.rates,
          label: instance?.label || null,
        } : null,
      };
    });

    return {
      days: cleanDays,
      since: since.toISOString(),
      total: items.reduce((sum, item) => sum + item.count, 0),
      items,
    };
  }
}

function parseKeys(rawKeys: string | string[] | undefined) {
  const source = Array.isArray(rawKeys) ? rawKeys.join(',') : String(rawKeys ?? '');
  return source
    .split(',')
    .map(key => key.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYS_PER_REQUEST);
}
