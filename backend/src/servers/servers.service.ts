import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CreateServerDto, FilterServersDto, UpdateServerDto } from './dto/server.dto';

function rateRange(n: number): string {
  if (n <= 5)     return 'low';
  if (n <= 49)    return 'mid';
  if (n <= 100)   return 'high';
  if (n <= 999)   return 'ultra';
  if (n <= 9999)  return 'mega';
  return 'extreme';
}

// Сид для «Сервера дня» — меняется раз в 5 часов (окна 0-4, 5-9, 10-14, 15-19, 20-23 UTC).
function sodSeed(): number {
  const d = new Date();
  const window5h = Math.floor(d.getUTCHours() / 5);
  const s = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-w${window5h}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

@Injectable()
export class ServersService {
  constructor(
    private prisma: PrismaService,
    private monitoring: MonitoringService,
  ) {}

  // ── Получить все с фильтрами ─────────────────
  async findAll(filters: FilterServersDto) {
    // sort без default: пустое = «по умолчанию» (пьедестал VIP → СоД → Буст
     // → остальные по голосам). Явные значения: opened/name/rating/votes.
    const { search, chronicle, rate, donate, type, openedWithin, sort, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { name:      { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (donate)       where.donate = donate;
    if (type)         where.type = { has: type };
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
              : sort === 'votes'  ? { weeklyVotes: 'desc' }
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

    let filtered = allServers.filter(s => matchesChronicle(s) && matchesRate(s) && matchesOpenedWithin(s));

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

    // Сервер дня: детерминированный рандом, окно 5 часов. Пул — ВСЯ БД минус VIP/бустовые,
    // НЕ зависит от поиска/фильтров, чтобы SoD не менялся при вводе в поиск.
    const poolForSod = await this.prisma.server.findMany({
      select: { id: true, subscription: { select: { plan: true, endDate: true } } },
      orderBy: { id: 'asc' }, // стабильный порядок — один и тот же сид даёт один и тот же сервер
    });
    const eligibleSod = poolForSod.filter(s => {
      const subActive = s.subscription?.endDate && s.subscription.endDate > now;
      const isVip = s.subscription?.plan === 'VIP' && subActive;
      return !isVip && !boostMap.has(s.id);
    });
    const sodId = eligibleSod.length
      ? eligibleSod[sodSeed() % eligibleSod.length].id
      : null;

    // Приклеиваем флаги и сортируем: VIP → Boosted (по endDate DESC) → Сервер дня → остальные
    const decorated = filtered.map(s => {
      const plan = (s.subscription as any)?.plan ?? 'FREE';
      const subActive = s.subscription?.endDate && s.subscription.endDate > now;
      const isVip  = plan === 'VIP' && subActive;
      const boostEnd = boostMap.get(s.id) ?? null;
      const isBoosted = !!boostEnd;
      const isSod    = s.id === sodId;
      return { ...s, _isVip: isVip, _boostEnd: boostEnd, _isBoosted: isBoosted, _isSod: isSod };
    });

    // При явной сортировке (opened/rating/votes/name) — пиннится только VIP,
    // остальные (включая SoD/Boost) идут в порядке выбранной сортировки.
    // Это «честный» режим, когда юзер сам выбрал критерий и не хочет видеть
    // продвижение. SoD/Boost доступны в default-режиме (если sort пуст).
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
      // Обычные серверы по умолчанию — по голосам за неделю
      return (b.weeklyVotes ?? 0) - (a.weeklyVotes ?? 0);
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
    return { ...server, boost };
  }

  // ── Создать (только admin) ───────────────────
  async create(dto: CreateServerDto) {
    const { openedDate, ...rest } = dto;
    const server = await this.prisma.server.create({
      data: {
        ...rest,
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
    const { id: _id, openedDate, onlineSourceUrl, ...data } = dto as any;
    const onlineSourceChanged = onlineSourceUrl !== undefined && onlineSourceUrl !== (existing as any).onlineSourceUrl;
    return this.prisma.server.update({
      where: { id },
      data: {
        ...data,
        ...(onlineSourceUrl !== undefined && {
          onlineSourceUrl,
          ...(onlineSourceChanged && {
            onlineSourceStatus: 'disabled',
            online: null,
            onlineUpdatedAt: null,
          }),
        }),
        openedDate: openedDate ? new Date(openedDate) : undefined,
      },
    });
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
    if (!data.name?.trim() || !data.chronicle?.trim() || !data.rates?.trim() || !data.url?.trim()) {
      throw new BadRequestException('Заполните название, хронику, рейты и URL');
    }

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
      where: { url: data.url, status: { in: ['pending', 'approved'] } },
    });
    if (existing) {
      throw new BadRequestException('Заявка для этого сервера уже существует');
    }

    return this.prisma.serverRequest.create({
      data: {
        userId,
        name:       data.name.trim(),
        chronicle:  data.chronicle.trim(),
        rates:      data.rates.trim(),
        url:        data.url.trim(),
        openedDate: data.openedDate ? new Date(data.openedDate) : null,
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
  async getFilterCounts() {
    const all = await this.prisma.server.findMany({
      select: { chronicle: true, rateNum: true, donate: true, type: true, instances: true },
    });

    const chronicles: Record<string, number> = {};
    const rates: Record<string, number> = { low: 0, mid: 0, high: 0, ultra: 0, mega: 0, extreme: 0 };
    const donates: Record<string, number> = {};
    const types: Record<string, number> = {};

    for (const s of all) {
      // Один проект = +1 к каждой уникальной хронике/рейту, что у него встречается
      // (свои + по всем instances). Иначе при наличии 3 запусков x10/x100/x1000
      // у Scryde фильтр показал бы +3 в каждом, что ввело бы в заблуждение.
      const insts: any[] = Array.isArray(s.instances) ? s.instances : [];
      const chronSet = new Set<string>();
      const rateSet  = new Set<string>();
      if (s.chronicle) chronSet.add(s.chronicle);
      rateSet.add(rateRange(s.rateNum));
      for (const i of insts) {
        if (typeof i?.chronicle === 'string') chronSet.add(i.chronicle);
        if (typeof i?.rateNum === 'number')   rateSet.add(rateRange(i.rateNum));
      }
      for (const c of chronSet) chronicles[c] = (chronicles[c] || 0) + 1;
      for (const r of rateSet)  rates[r] = (rates[r] || 0) + 1;

      donates[s.donate] = (donates[s.donate] || 0) + 1;
      for (const t of s.type) {
        types[t] = (types[t] || 0) + 1;
      }
    }

    return { chronicles, rates, donates, types };
  }

  // ── Статистика ───────────────────────────────
  async getStats() {
    const [total, vip, newCount, monthlyVotesAgg, onlineAgg] = await Promise.all([
      this.prisma.server.count(),
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
      this.prisma.server.aggregate({
        where: { online: { not: null }, onlineSourceStatus: 'ok' },
        _sum: { online: true },
      }),
    ]);
    const reviewCount = await this.prisma.review.count({ where: { approved: true } });
    return {
      total,
      vip,
      newCount,
      reviewCount,
      monthlyVotes: monthlyVotesAgg._sum.monthlyVotes ?? 0,
      totalOnline: onlineAgg._sum.online ?? 0,
    };
  }
}
