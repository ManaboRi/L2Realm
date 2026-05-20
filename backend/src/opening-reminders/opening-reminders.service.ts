import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HOUR_MS = 60 * 60 * 1000;
const OPENING_DAY_MS = 24 * 60 * 60 * 1000;

function isFutureOpening(value?: Date | string | null) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  return !isNaN(ts) && ts > Date.now();
}

function reminderKey(serverId: string, instanceId?: string | null) {
  return instanceId ? `${serverId}::${instanceId}` : serverId;
}

@Injectable()
export class OpeningRemindersService {
  constructor(private prisma: PrismaService) {}

  async keys(userId: string) {
    const rows = await this.prisma.openingReminder.findMany({
      where: { userId, openingAt: { gt: new Date() } },
      select: { serverId: true, instanceId: true },
    });
    return rows.map(r => reminderKey(r.serverId, r.instanceId || null));
  }

  async due(userId: string) {
    const now = new Date();
    return this.prisma.openingReminder.findMany({
      where: {
        userId,
        openingAt: {
          lte: new Date(now.getTime() + OPENING_DAY_MS),
          gt: new Date(now.getTime() - OPENING_DAY_MS),
        },
      },
      orderBy: { openingAt: 'asc' },
      take: 10,
      include: {
        server: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  async add(userId: string, serverId: string, instanceId?: string | null) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');

    const cleanInstanceId = instanceId || '';
    let openingAt: Date | null = null;

    if (cleanInstanceId) {
      const instances = Array.isArray(server.instances) ? server.instances as any[] : [];
      const instance = instances.find(i => i?.id === cleanInstanceId);
      if (!instance) throw new NotFoundException('Opening not found');
      openingAt = instance.openedDate ? new Date(instance.openedDate) : null;
    } else {
      openingAt = server.openedDate ? new Date(server.openedDate) : null;
    }

    if (!isFutureOpening(openingAt)) {
      throw new BadRequestException('Opening date is not in the future');
    }

    return this.prisma.openingReminder.upsert({
      where: { userId_serverId_instanceId: { userId, serverId, instanceId: cleanInstanceId } },
      update: {
        openingAt,
        notifyAt: new Date(openingAt.getTime() - HOUR_MS),
        notifiedAt: null,
      },
      create: {
        userId,
        serverId,
        instanceId: cleanInstanceId,
        openingAt,
        notifyAt: new Date(openingAt.getTime() - HOUR_MS),
      },
    });
  }

  async remove(userId: string, serverId: string, instanceId?: string | null) {
    await this.prisma.openingReminder.deleteMany({
      where: { userId, serverId, instanceId: instanceId || '' },
    });
    return { ok: true };
  }
}
