import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CreateServerDto, FilterServersDto, UpdateServerDto } from './dto/server.dto';
import { dateString, optionalSafeAssetUrl, optionalSafeMarkdownText, optionalSafeText, optionalSafeUrl, parseOrThrow, safeSlug, safeText, safeUrl } from '../common/input-validation';
import { z } from 'zod';

const serverInstanceSchema = z.object({
  id: optionalSafeText(64),
  label: optionalSafeText(80),
  chronicle: optionalSafeText(80),
  rates: optionalSafeText(40),
  rateNum: z.coerce.number().int().min(1).max(1_000_000).optional(),
  type: z.enum(['pvp', 'pve', 'pvp-pve', 'gve', 'rvr', 'multiproff', 'multicraft']).optional(),
  donate: z.enum(['free', 'cosmetic', 'convenience', 'p2w']).optional(),
  url: optionalSafeUrl,
  shortDesc: optionalSafeText(240),
  openedDate: z.union([dateString, z.literal(''), z.null()]).optional().transform(value => value || null),
  soonVipUntil: z.union([dateString, z.literal(''), z.null()]).optional().transform(value => value || null),
  soonVipPaymentId: optionalSafeText(120),
}).passthrough();

const serverPayloadSchema = z.object({
  id: safeSlug.max(64),
  name: safeText(2, 80),
  abbr: optionalSafeText(6),
  url: safeUrl,
  chronicle: safeText(1, 80),
  rates: safeText(1, 40),
  rateNum: z.coerce.number().int().min(1).max(1_000_000).optional(),
  donate: z.enum(['free', 'cosmetic', 'convenience', 'p2w']).optional(),
  type: z.array(safeText(1, 40)).max(20).optional(),
  vip: z.coerce.boolean().optional(),
  voteRewardsEnabled: z.coerce.boolean().optional(),
  openedDate: z.union([dateString, z.literal(''), z.null()]).optional().transform(value => value || null),
  country: optionalSafeText(8),
  icon: optionalSafeAssetUrl,
  banner: optionalSafeAssetUrl,
  discord: optionalSafeUrl,
  telegram: optionalSafeUrl,
  vk: optionalSafeUrl,
  youtube: optionalSafeUrl,
  site: optionalSafeUrl,
  clientUrl: optionalSafeUrl,
  patchUrl: optionalSafeUrl,
  updaterUrl: optionalSafeUrl,
  installGuide: optionalSafeMarkdownText(2_000),
  shortDesc: optionalSafeText(300),
  fullDesc: optionalSafeText(10_000),
  statusOverride: z.union([z.enum(['online', 'offline', 'unknown']), z.literal(''), z.null()]).optional().transform(value => value || null),
  instances: z.array(serverInstanceSchema).max(50).optional(),
});

const serverUpdateSchema = serverPayloadSchema.partial().omit({ id: true }).extend({
  id: safeSlug.max(64).optional(),
});

const serverRequestSchema = z.object({
  name: safeText(2, 80),
  chronicle: safeText(1, 80),
  rates: safeText(1, 40),
  url: safeUrl,
  openedDate: z.union([dateString, z.literal(''), z.null()]).optional().transform(value => value || null),
});

function rateRange(n: number): string {
  if (n <= 5)     return 'low';
  if (n <= 49)    return 'mid';
  if (n <= 100)   return 'high';
  if (n <= 999)   return 'ultra';
  if (n <= 9999)  return 'mega';
  return 'extreme';
}

function isComingSoonServer(s: any, nowTs = Date.now()): boolean {
  if (s.openedDate && new Date(s.openedDate).getTime() > nowTs) return true;
  const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
  return insts.some(i => i?.openedDate && new Date(i.openedDate).getTime() > nowTs);
}

function hasOpenedLaunch(s: any, nowTs = Date.now()): boolean {
  if (s.openedDate) {
    const t = new Date(s.openedDate).getTime();
    if (!isNaN(t) && t <= nowTs) return true;
  }

  const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
  let hasDatedInstance = false;
  for (const i of insts) {
    if (!i?.openedDate) continue;
    const t = new Date(i.openedDate).getTime();
    if (isNaN(t)) continue;
    hasDatedInstance = true;
    if (t <= nowTs) return true;
  }

  if (insts.length === 0 && !s.openedDate) return true;
  if (insts.length > 0 && !s.openedDate && !hasDatedInstance) return true;
  return false;
}

function isOnlyComingSoonServer(s: any, nowTs = Date.now()): boolean {
  return isComingSoonServer(s, nowTs) && !hasOpenedLaunch(s, nowTs);
}

function normalizeStatusOverride(value?: string | null): 'online' | 'offline' | 'unknown' | null {
  if (value === 'online' || value === 'offline' || value === 'unknown') return value;
  return null;
}

function typeMatches(value: string | undefined, wanted: string): boolean {
  if (!value) return false;
  if (value === wanted) return true;
  return value === 'pvp-pve' && (wanted === 'pvp' || wanted === 'pve');
}

function addTypeForCounts(set: Set<string>, value: string | undefined) {
  if (!value) return;
  if (value === 'pvp-pve') {
    set.add('pvp');
    set.add('pve');
    return;
  }
  set.add(value);
}

@Injectable()
export class ServersService {
  constructor(
    private prisma: PrismaService,
    private monitoring: MonitoringService,
  ) {}

  // ── Получить все с фильтрами ─────────────────
  async findAll(filters: FilterServersDto) {
    // sort без default: пустое = «по умолчанию» (пьедестал VIP → сервер недели → Буст
     // → остальные по голосам). Явные значения: opened/name/rating/votes.
    const { search, chronicle, rate, donate, type, openedWithin, sort, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { name:      { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
      ];
    }
    // donate/type фильтруются в post-processing: у проекта могут быть разные запуски
    // с разными форматами и донатом внутри JSON instances.
    // openedWithin фильтруется в post-processing — у проекта может быть
    // несколько дат открытия (своя + по каждому instance). Если хоть одна
    // в окне since..now — проект попадает в выдачу.

    // chronicle и rate фильтруются в post-processing — у проекта могут быть
    // несколько хроник/рейтов через instances, плюс свои собственные. Где
    // совпадает хоть одно — проект попадает в выдачу.
    const allServers = await this.prisma.server.findMany({
      where,
      include: { subscription: true, _count: { select: { reviews: true } } },
      orderBy: sort === 'name'   ? { name: 'asc' }
              : sort === 'rating' ? { rating: 'desc' }
              : sort === 'votes'  ? { totalVotes: 'desc' }
              :                    { id: 'asc' }, // 'opened' будем сортировать в post-process
    });

    // Эффективная дата открытия — максимальная из собственной и instances.openedDate,
    // но только в прошлом (будущие даты — отдельный кейс /coming-soon).
    const nowTs = Date.now();
    function effectiveOpenedTs(s: any): number {
      const dates: number[] = [];
      if (s.openedDate) {
        const t = new Date(s.openedDate).getTime();
        if (!isNaN(t) && t <= nowTs) dates.push(t);
      }
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      for (const i of insts) {
        if (i?.openedDate) {
          const t = new Date(i.openedDate).getTime();
          if (!isNaN(t) && t <= nowTs) dates.push(t);
        }
      }
      return dates.length ? Math.max(...dates) : 0;
    }

    function matchesChronicle(s: any): boolean {
      if (!chronicle) return true;
      const c = chronicle.toLowerCase();
      if (s.chronicle?.toLowerCase().includes(c)) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      return insts.some(i => typeof i?.chronicle === 'string' && i.chronicle.toLowerCase().includes(c));
    }
    function matchesRate(s: any): boolean {
      if (!rate) return true;
      if (rateRange(s.rateNum) === rate) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      return insts.some(i => typeof i?.rateNum === 'number' && rateRange(i.rateNum) === rate);
    }
    function matchesOpenedWithin(s: any): boolean {
      if (!openedWithin) return true;
      const days = openedWithin === '7d' ? 7 : 30;
      const sinceTs = nowTs - days * 86400000;
      const eff = effectiveOpenedTs(s);
      return eff >= sinceTs && eff <= nowTs;
    }
    function matchesDonate(s: any): boolean {
      if (!donate) return true;
      const wanted = donate;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      const instValues = insts
        .map(i => i?.donate)
        .filter(value => value && value !== 'free');
      if (instValues.length > 0) return instValues.includes(wanted);
      return s.donate === wanted;
    }
    function matchesType(s: any): boolean {
      if (!type) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      const instValues = insts
        .map(i => i?.type)
        .filter(Boolean);
      if (instValues.length > 0) return instValues.some(value => typeMatches(value, type));
      return Array.isArray(s.type) && s.type.some(value => typeMatches(value, type));
    }

    let filtered = allServers.filter(s =>
      matchesChronicle(s) &&
      matchesRate(s) &&
      matchesOpenedWithin(s) &&
      matchesDonate(s) &&
      matchesType(s),
    );

    // При sort=opened — сортируем по эффективной дате (учитывает instances).
    // При пустом sort (default) — порядок задаст decorated.sort ниже
    // (VIP → СоД → Буст → остальные по голосам).
    if (sort === 'opened') {
      filtered.sort((a, b) => effectiveOpenedTs(b as any) - effectiveOpenedTs(a as any));
    }

    // Активные бусты (endDate > now) — словарь serverId → endDate
    const now = new Date();
    const boosts = await this.prisma.boost.findMany({
      where: { endDate: { gt: now } },
      select: { serverId: true, endDate: true },
    });
    const boostMap = new Map(boosts.map(b => [b.serverId, b.endDate]));

    // Сервер недели: проект с максимумом недельных голосов. Не зависит от поиска/фильтров.
    const serverOfWeek = await this.prisma.server.findFirst({
      where: { weeklyVotes: { gt: 0 } },
      select: { id: true },
      orderBy: [{ weeklyVotes: 'desc' }, { id: 'asc' }],
    });
    const sodId = serverOfWeek?.id ?? null;

    // Приклеиваем флаги и сортируем: VIP → Сервер недели → Boosted (по endDate DESC) → остальные
    const decorated = filtered.map(s => {
      const plan = (s.subscription as any)?.plan ?? 'FREE';
      const subActive = s.subscription?.endDate && s.subscription.endDate > now;
      const isVip  = plan === 'VIP' && subActive && !isOnlyComingSoonServer(s, nowTs);
      const boostEnd = boostMap.get(s.id) ?? null;
      const isBoosted = !!boostEnd;
      const isSod    = s.id === sodId;
      const manualStatus = normalizeStatusOverride((s as any).statusOverride);
      return { ...s, ...(manualStatus && { status: manualStatus }), _isVip: isVip, _boostEnd: boostEnd, _isBoosted: isBoosted, _isSod: isSod };
    });

    // При явной сортировке (opened/rating/votes/name) — пиннится только VIP,
    // остальные (включая сервер недели/Boost) идут в порядке выбранной сортировки.
    // Это «честный» режим, когда юзер сам выбрал критерий и не хочет видеть
    // продвижение. Сервер недели/Boost доступны в default-режиме (если sort пуст).
    const isExplicitSort = sort === 'name' || sort === 'rating' || sort === 'votes' || sort === 'opened';

    decorated.sort((a, b) => {
      // VIP всегда наверху — это часть купленной услуги
      if (a._isVip !== b._isVip) return a._isVip ? -1 : 1;

      if (isExplicitSort) {
        // Возвращаем 0 → стабильная сортировка JS сохранит порядок из orderBy
        return 0;
      }

      if (a._isSod !== b._isSod) return a._isSod ? -1 : 1;
      if (a._isBoosted !== b._isBoosted) return a._isBoosted ? -1 : 1;
      if (a._isBoosted && b._isBoosted) {
        return (b._boostEnd!.getTime() - a._boostEnd!.getTime());
      }
      // Обычные серверы по умолчанию — по голосам за всё время
      return (b.totalVotes ?? 0) - (a.totalVotes ?? 0);
    });

    const total = decorated.length;
    const start = (page - 1) * limit;
    const data  = decorated.slice(start, start + limit);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Один сервер ──────────────────────────────
  async findOne(id: string) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: {
        subscription: true,
        reviews: {
          where: { approved: true },
          include: { user: { select: { id: true, nickname: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        news: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!server) throw new NotFoundException('Сервер не найден');
    const boost = await this.prisma.boost.findFirst({
      where: { serverId: id, endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });
    const manualStatus = normalizeStatusOverride((server as any).statusOverride);
    return { ...server, ...(manualStatus && { status: manualStatus }), boost };
  }

  // ── Создать (только admin) ───────────────────
  async create(dto: CreateServerDto) {
    const clean = parseOrThrow(serverPayloadSchema, dto) as any;
    const { openedDate, ...rest } = clean;
    const manualStatus = normalizeStatusOverride((rest as any).statusOverride);
    const server = await this.prisma.server.create({
      data: {
        ...rest,
        ...(manualStatus && { status: manualStatus }),
        openedDate: openedDate ? new Date(openedDate) : undefined,
      },
    });

    // Запускаем первую проверку мониторинга в фоне
    this.monitoring.checkServer(server.id).catch(() => {});

    return server;
  }

  // ── Обновить (только admin) ──────────────────
  async update(id: string, dto: UpdateServerDto) {
    const existing = await this.findOne(id);
    const clean = parseOrThrow(serverUpdateSchema, dto) as any;
    const { id: _id, openedDate, ...data } = clean as any;
    const manualStatus = normalizeStatusOverride(data.statusOverride);
    const statusOverrideTouched = Object.prototype.hasOwnProperty.call(data, 'statusOverride');
    const server = await this.prisma.server.update({
      where: { id },
      data: {
        ...data,
        ...(manualStatus && { status: manualStatus }),
        openedDate: openedDate ? new Date(openedDate) : undefined,
      },
    });
    if (statusOverrideTouched && !manualStatus) {
      await this.monitoring.checkServer(id).catch(() => {});
      return this.findOne(id);
    }
    return server;
  }

  // ── Удалить (только admin) ───────────────────
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.server.delete({ where: { id } });
  }

  // ── Заявка на добавление (авторизовано, 1/24ч) ─
  async submitRequest(userId: string, data: {
    name: string; chronicle: string; rates: string; url: string; openedDate?: string;
  }) {
    const clean = parseOrThrow(serverRequestSchema, data);

    // Rate-limit: не чаще 1 заявки за 24 часа с аккаунта
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const recent = await this.prisma.serverRequest.findFirst({
      where: { userId, createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const next = new Date(recent.createdAt);
      next.setHours(next.getHours() + 24);
      throw new BadRequestException(
        `Можно подавать не чаще 1 заявки в 24 часа. Следующая — после ${next.toLocaleString('ru-RU')}`,
      );
    }

    // Антиспам: не принимаем дубли по URL (pending или approved)
    const existing = await this.prisma.serverRequest.findFirst({
      where: { url: clean.url, status: { in: ['pending', 'approved'] } },
    });
    if (existing) {
      throw new BadRequestException('Заявка для этого сервера уже существует');
    }

    return this.prisma.serverRequest.create({
      data: {
        userId,
        name:       clean.name,
        chronicle:  clean.chronicle,
        rates:      clean.rates,
        url:        clean.url,
        openedDate: clean.openedDate ? new Date(clean.openedDate) : null,
      },
    });
  }

  // ── Список заявок (admin) ────────────────────
  async getRequests() {
    return this.prisma.serverRequest.findMany({
      include: { user: { select: { id: true, email: true, name: true, nickname: true, avatar: true, vkId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Обновить статус заявки (admin) ───────────
  async updateRequestStatus(id: string, status: string) {
    if (status === 'approved') {
      const request = await this.prisma.serverRequest.findUnique({ where: { id } });
      if (request?.status === 'pending_payment' && !request.paid) {
        throw new BadRequestException('Нельзя одобрить заявку до успешной оплаты');
      }
    }
    return this.prisma.serverRequest.update({ where: { id }, data: { status } });
  }

  // ── Удалить заявку (admin) ───────────────────
  async deleteRequest(id: string) {
    return this.prisma.serverRequest.delete({ where: { id } });
  }

  // ── Серверы "Скоро открытие" ─────────────────
  // Проект попадает сюда если у него либо собственный openedDate в будущем,
  // либо хотя бы один instance с openedDate в будущем (новый запуск проекта).
  async getComingSoon() {
    const now = new Date();
    const all = await this.prisma.server.findMany({
      include: { subscription: true },
      orderBy: { openedDate: 'asc' },
    });
    const filtered = all.filter(s => {
      if (s.openedDate && s.openedDate > now) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      return insts.some(i => i?.openedDate && new Date(i.openedDate) > now);
    });
    // Сортируем по ближайшему будущему openedDate (свой или из instances)
    filtered.sort((a, b) => {
      const aDates = [a.openedDate, ...(Array.isArray(a.instances) ? (a.instances as any[]).map(i => i?.openedDate) : [])]
        .filter(Boolean).map(d => new Date(d as any).getTime()).filter(t => t > now.getTime());
      const bDates = [b.openedDate, ...(Array.isArray(b.instances) ? (b.instances as any[]).map(i => i?.openedDate) : [])]
        .filter(Boolean).map(d => new Date(d as any).getTime()).filter(t => t > now.getTime());
      return Math.min(...aDates) - Math.min(...bDates);
    });
    return filtered;
  }

  // ── Счётчики для фильтров ────────────────────
  async getFilterCounts(filters?: FilterServersDto) {
    const all = await this.prisma.server.findMany({
      select: { chronicle: true, rateNum: true, donate: true, type: true, instances: true, openedDate: true },
    });

    // Применяем все фильтры КРОМЕ того, по которому считаем counts.
    // Это даёт «зависимые» фильтры: выбрал хронику Interlude → counts.rates
    // показывает сколько серверов в Interlude по каждому диапазону рейтов.
    // Counts по chronicle при этом считается без учёта самого chronicle-фильтра
    // (иначе осталась бы только одна хроника).
    const f = filters ?? {};
    const nowTs = Date.now();

    function chronicleMatch(s: any): boolean {
      if (!f.chronicle) return true;
      const c = f.chronicle.toLowerCase();
      if (s.chronicle?.toLowerCase().includes(c)) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      return insts.some(i => typeof i?.chronicle === 'string' && i.chronicle.toLowerCase().includes(c));
    }
    function rateMatch(s: any): boolean {
      if (!f.rate) return true;
      if (rateRange(s.rateNum) === f.rate) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      return insts.some(i => typeof i?.rateNum === 'number' && rateRange(i.rateNum) === f.rate);
    }
    function donateMatch(s: any): boolean {
      if (!f.donate) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      const has = (val?: string) => val === f.donate;
      if (insts.some(i => has(i?.donate))) return true;
      if (insts.length === 0 && has(s.donate)) return true;
      return false;
    }
    function typeMatchLocal(s: any): boolean {
      if (!f.type) return true;
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      if (insts.some(i => typeMatches(i?.type, f.type as string))) return true;
      if (insts.length === 0 && Array.isArray(s.type) && s.type.some((t: string) => typeMatches(t, f.type as string))) return true;
      return false;
    }
    function openedMatch(s: any): boolean {
      if (!f.openedWithin) return true;
      const days = f.openedWithin === '7d' ? 7 : 30;
      const sinceTs = nowTs - days * 86400000;
      const dates: number[] = [];
      if (s.openedDate) {
        const t = new Date(s.openedDate).getTime();
        if (!isNaN(t) && t <= nowTs) dates.push(t);
      }
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      for (const i of insts) {
        if (i?.openedDate) {
          const t = new Date(i.openedDate).getTime();
          if (!isNaN(t) && t <= nowTs) dates.push(t);
        }
      }
      const eff = dates.length ? Math.max(...dates) : 0;
      return eff >= sinceTs && eff <= nowTs;
    }

    function applyExcept(except: 'chronicle' | 'rate' | 'donate' | 'type' | 'opened'): any[] {
      return all.filter(s => {
        if (except !== 'chronicle' && !chronicleMatch(s)) return false;
        if (except !== 'rate'      && !rateMatch(s))      return false;
        if (except !== 'donate'    && !donateMatch(s))    return false;
        if (except !== 'type'      && !typeMatchLocal(s)) return false;
        if (except !== 'opened'    && !openedMatch(s))    return false;
        return true;
      });
    }

    function dimensionCounts(servers: any[], dimension: 'chronicle' | 'rate' | 'donate' | 'type'): Record<string, number> {
      const out: Record<string, number> = {};
      for (const s of servers) {
        const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
        const set = new Set<string>();
        if (dimension === 'chronicle') {
          if (s.chronicle) set.add(s.chronicle);
          for (const i of insts) if (typeof i?.chronicle === 'string') set.add(i.chronicle);
        } else if (dimension === 'rate') {
          set.add(rateRange(s.rateNum));
          for (const i of insts) if (typeof i?.rateNum === 'number') set.add(rateRange(i.rateNum));
        } else if (dimension === 'donate') {
          for (const i of insts) {
            if (typeof i?.donate === 'string' && i.donate !== 'free') set.add(i.donate);
          }
          if (set.size === 0 && s.donate && s.donate !== 'free') set.add(s.donate);
        } else if (dimension === 'type') {
          for (const i of insts) {
            if (typeof i?.type === 'string') addTypeForCounts(set, i.type);
          }
          if (set.size === 0 && Array.isArray(s.type)) {
            for (const t of s.type) addTypeForCounts(set, t);
          }
        }
        for (const v of set) out[v] = (out[v] || 0) + 1;
      }
      return out;
    }

    const chronicles = dimensionCounts(applyExcept('chronicle'), 'chronicle');
    const rateBase: Record<string, number> = { low: 0, mid: 0, high: 0, ultra: 0, mega: 0, extreme: 0 };
    const rates    = { ...rateBase, ...dimensionCounts(applyExcept('rate'), 'rate') };
    const donates  = dimensionCounts(applyExcept('donate'), 'donate');
    const types    = dimensionCounts(applyExcept('type'), 'type');

    return { chronicles, rates, donates, types };
  }

  // ── Статистика ───────────────────────────────
  async getStats() {
    const [servers, vip, newCount, monthlyVotesAgg] = await Promise.all([
      this.prisma.server.findMany({ select: { instances: true } }),
      this.prisma.server.count({ where: { vip: true } }),
      this.prisma.server.count({
        where: {
          openedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.server.aggregate({
        _sum: { monthlyVotes: true },
      }),
    ]);
    const reviewCount = await this.prisma.review.count({ where: { approved: true } });
    const total = servers.length;
    const launchCount = servers.reduce((sum, s) => {
      const instances = Array.isArray(s.instances) ? s.instances : [];
      return sum + (instances.length > 0 ? instances.length : 1);
    }, 0);
    return {
      total,
      launchCount,
      vip,
      newCount,
      reviewCount,
      monthlyVotes: monthlyVotesAgg._sum.monthlyVotes ?? 0,
    };
  }
}
