import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  // Публичные активные баннеры (только не истёкшие), по слотам.
  async getActive() {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        active: true,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: [{ slot: 'asc' }, { createdAt: 'desc' }],
    });
    // По одному баннеру на слот (самый свежий активный).
    const bySlot = new Map<number, typeof banners[number]>();
    for (const b of banners) if (!bySlot.has(b.slot)) bySlot.set(b.slot, b);
    return [...bySlot.values()].map(b => ({
      id: b.id,
      slot: b.slot,
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
      href: b.href,
      advertiser: b.advertiser,
      erid: b.erid,
    }));
  }

  // Все баннеры для админки.
  async listAll() {
    return this.prisma.banner.findMany({ orderBy: [{ slot: 'asc' }, { createdAt: 'desc' }] });
  }

  async create(data: any) {
    return this.prisma.banner.create({
      data: {
        slot: Number(data.slot) || 1,
        title: String(data.title ?? '').slice(0, 120),
        subtitle: data.subtitle ? String(data.subtitle).slice(0, 160) : null,
        image: data.image ? String(data.image) : null,
        href: String(data.href ?? ''),
        advertiser: data.advertiser ? String(data.advertiser).slice(0, 160) : null,
        erid: data.erid ? String(data.erid).slice(0, 80) : null,
        active: data.active !== false,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.banner.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Баннер не найден');
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(data.slot !== undefined && { slot: Number(data.slot) || 1 }),
        ...(data.title !== undefined && { title: String(data.title).slice(0, 120) }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle ? String(data.subtitle).slice(0, 160) : null }),
        ...(data.image !== undefined && { image: data.image ? String(data.image) : null }),
        ...(data.href !== undefined && { href: String(data.href) }),
        ...(data.advertiser !== undefined && { advertiser: data.advertiser ? String(data.advertiser).slice(0, 160) : null }),
        ...(data.erid !== undefined && { erid: data.erid ? String(data.erid).slice(0, 80) : null }),
        ...(data.active !== undefined && { active: !!data.active }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.banner.deleteMany({ where: { id } });
    return { ok: true };
  }

  // Счётчик кликов (публичный, по beacon с фронта).
  async registerClick(id: string) {
    await this.prisma.banner.updateMany({ where: { id }, data: { clicks: { increment: 1 } } });
    return { ok: true };
  }
}
