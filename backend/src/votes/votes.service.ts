import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async vote(userId: string, serverId: string, ip: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId }, select: { id: true } });
    if (!server) throw new NotFoundException('Сервер не найден');

    // Serializable защищает от race condition: при одновременных запросах
    // (двойной клик / параллельные вкладки) PostgreSQL обнаружит конфликт
    // read-write и откатит вторую транзакцию (P2034) — её мы и интерпретируем
    // как повторный голос.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cooldownAgo = new Date(Date.now() - COOLDOWN_MS);
        const recent = await tx.vote.findFirst({
          where: { serverId, createdAt: { gt: cooldownAgo }, OR: [{ userId }, { ip }] },
          orderBy: { createdAt: 'desc' },
        });

        if (recent) {
          const cooldownEnds = new Date(recent.createdAt.getTime() + COOLDOWN_MS);
          throw new BadRequestException({ message: 'Повторный голос заблокирован', cooldownEnds });
        }

        await tx.vote.create({ data: { userId, serverId, ip } });
        await tx.server.update({
          where: { id: serverId },
          data: { monthlyVotes: { increment: 1 }, weeklyVotes: { increment: 1 } },
        });

        return { success: true };
      }, { isolationLevel: 'Serializable' });
    } catch (e: any) {
      if (e?.code === 'P2034' || (typeof e?.message === 'string' && /serialize|40001/i.test(e.message))) {
        throw new BadRequestException({ message: 'Повторный голос заблокирован' });
      }
      throw e;
    }
  }

  async getStatus(userId: string, serverId: string, ip: string) {
    const cooldownAgo = new Date(Date.now() - COOLDOWN_MS);
    const last = await this.prisma.vote.findFirst({
      where: {
        serverId,
        createdAt: { gt: cooldownAgo },
        OR: [{ userId }, { ip }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) return { voted: false, cooldownEnds: null };
    return { voted: true, cooldownEnds: new Date(last.createdAt.getTime() + COOLDOWN_MS) };
  }

  // Сброс ежемесячного счётчика — 1-го числа каждого месяца в 00:00 UTC
  @Cron('0 0 1 * *')
  async resetMonthlyVotes() {
    await this.prisma.server.updateMany({ data: { monthlyVotes: 0, weeklyVotes: 0 } });
  }

  // Сброс недельного счётчика — каждую пятницу в 06:00 МСК (= 03:00 UTC)
  @Cron('0 3 * * 5')
  async resetWeeklyVotes() {
    await this.prisma.server.updateMany({ data: { weeklyVotes: 0 } });
  }
}
