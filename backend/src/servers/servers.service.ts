import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CreateServerDto, FilterServersDto, UpdateServerDto } from './dto/server.dto';

function rateRange(n: number): string {
  if (n <= 5)    return 'low';
  if (n <= 49)   return 'mid';
  if (n <= 100)  return 'high';
  if (n <= 999)  return 'ultra';
  return 'mega';
}

// Сид для «Сервера дня» — меняется раз в 5 часов (окно 0-4, 5-9, 10-14, 15-19, 20-23 UTC).
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
    const { search, chronicle, rate, donate, type, sort = 'opened', page = 1, limit = 50 } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { name:      { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (chronicle) where.chronicle = { startsWith: chronicle, mode: 'insensitive' };
    if (donate)    where.donate = donate;
    if (type)      where.type = { has: type };

    // Фильтр по рейту требует post-processing т.к. rateNum хранится как число
    const allServers = await this.prisma.server.findMany({
      where,
      include: { subscription: true, _count: { select: { reviews: true } } },
      orderBy: sort === 'name'   ? { name: 'asc' }
              : sort === 'rating' ? { rating: 'desc' }
              :                    { openedDate: 'desc' },
    });

    // Фильтр по рейт-диапазону
    const filtered = rate
      ? allServers.filter(s => rateRange(s.rateNum) === rate)
      : allServers;

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

    decorated.sort((a, b) => {
      if (a._isVip !== b._isVip) return a._isVip ? -1 : 1;
      if (a._isSod !== b._isSod) return a._isSod ? -1 : 1;
      if (a._isBoosted !== b._isBoosted) return a._isBoosted ? -1 : 1;
      if (a._isBoosted && b._isBoosted) {
        return (b._boostEnd!.getTime() - a._boostEnd!.getTime());
      }
      return 0; // стабильно: сохраняем исходный user-sort
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
    await this.findOne(id);
    const { id: _id, openedDate, ...data } = dto as any;
    return this.prisma.server.update({
      where: { id },
      data: { ...data, openedDate: openedDate ? new Date(openedDate) : undefined },
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
    return this.prisma.serverRequest.update({ where: { id }, data: { status } });
  }

  // ── Удалить заявку (admin) ───────────────────
  async deleteRequest(id: string) {
    return this.prisma.serverRequest.delete({ where: { id } });
  }

  // ── Серверы "Скоро открытие" ─────────────────
  async getComingSoon() {
    const now = new Date();
    const servers = await this.prisma.server.findMany({
      where: { openedDate: { gt: now } },
      include: { subscription: true },
      orderBy: { openedDate: 'asc' },
    });
    return servers;
  }

  // ── Счётчики для фильтров ────────────────────
  async getFilterCounts() {
    const all = await this.prisma.server.findMany({
      select: { chronicle: true, rateNum: true, donate: true, type: true },
    });

    const chronicles: Record<string, number> = {};
    const rates: Record<string, number> = { low: 0, mid: 0, high: 0, ultra: 0, mega: 0 };
    const donates: Record<string, number> = {};
    const types: Record<string, number> = {};

    for (const s of all) {
      chronicles[s.chronicle] = (chronicles[s.chronicle] || 0) + 1;
      rates[rateRange(s.rateNum)] = (rates[rateRange(s.rateNum)] || 0) + 1;
      donates[s.donate] = (donates[s.donate] || 0) + 1;
      for (const t of s.type) {
        types[t] = (types[t] || 0) + 1;
      }
    }

    return { chronicles, rates, donates, types };
  }

  // ── Статистика ───────────────────────────────
  async getStats() {
    const [total, vip, newCount] = await Promise.all([
      this.prisma.server.count(),
      this.prisma.server.count({ where: { vip: true } }),
      this.prisma.server.count({
        where: {
          openedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    const reviewCount = await this.prisma.review.count({ where: { approved: true } });
    return { total, vip, newCount, reviewCount };
  }
}
