import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CreateServerDto, FilterServersDto, UpdateServerDto } from './dto/server.dto';

function rateRange(n: number): string {
  if (n <= 5)   return 'low';
  if (n <= 49)  return 'mid';
  if (n <= 100) return 'high';
  return 'ultra';
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

    // Сортировка по тарифу: VIP > PREMIUM > STANDARD > FREE
    const planOrder: Record<string, number> = { VIP: 4, PREMIUM: 3, STANDARD: 2, FREE: 1 };
    filtered.sort((a, b) => {
      const aP = planOrder[(a.subscription as any)?.plan ?? 'FREE'] ?? 1;
      const bP = planOrder[(b.subscription as any)?.plan ?? 'FREE'] ?? 1;
      return bP - aP;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data  = filtered.slice(start, start + limit);

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
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        news: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!server) throw new NotFoundException('Сервер не найден');
    return server;
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

  // ── Заявка на добавление ─────────────────────
  async submitRequest(data: {
    name: string; chronicle: string; rates: string; url: string;
    icon?: string; description?: string; plan: string; email?: string;
  }) {
    // Антиспам: не принимаем дубли по URL (pending или approved)
    const existing = await this.prisma.serverRequest.findFirst({
      where: { url: data.url, status: { in: ['pending', 'approved'] } },
    });
    if (existing) {
      throw new Error('Заявка для этого сервера уже существует');
    }
    return this.prisma.serverRequest.create({ data });
  }

  // ── Список заявок (admin) ────────────────────
  async getRequests() {
    return this.prisma.serverRequest.findMany({ orderBy: { createdAt: 'desc' } });
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
    const rates: Record<string, number> = { low: 0, mid: 0, high: 0, ultra: 0 };
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
