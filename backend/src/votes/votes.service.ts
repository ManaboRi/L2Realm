import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function normalizeNickname(value?: string): string {
  const nickname = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (nickname.length < 2 || nickname.length > 32) {
    throw new BadRequestException('Укажи ник персонажа от 2 до 32 символов');
  }
  if (!/^[\p{L}\p{N}_\-. ]+$/u.test(nickname)) {
    throw new BadRequestException('Ник может содержать буквы, цифры, пробел, _, - и точку');
  }
  return nickname;
}

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async vote(userId: string | null, serverId: string, ip: string, rawNickname?: string) {
    const nickname = normalizeNickname(rawNickname);
    const server = await this.prisma.server.findUnique({ where: { id: serverId }, select: { id: true } });
    if (!server) throw new NotFoundException('Сервер не найден');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const cooldownAgo = new Date(Date.now() - COOLDOWN_MS);
        const cooldownOr: any[] = [{ ip }];
        if (userId) cooldownOr.push({ userId });

        const recent = await tx.vote.findFirst({
          where: { serverId, createdAt: { gt: cooldownAgo }, OR: cooldownOr },
          orderBy: { createdAt: 'desc' },
        });

        if (recent) {
          const cooldownEnds = new Date(recent.createdAt.getTime() + COOLDOWN_MS);
          throw new BadRequestException({ message: 'Повторный голос заблокирован', cooldownEnds });
        }

        await tx.vote.create({ data: { userId: userId ?? undefined, serverId, ip, nickname } });
        await tx.server.update({
          where: { id: serverId },
          data: {
            totalVotes: { increment: 1 },
            monthlyVotes: { increment: 1 },
            weeklyVotes: { increment: 1 },
          },
        });

        return { success: true, nickname };
      }, { isolationLevel: 'Serializable' });
    } catch (e: any) {
      if (e?.code === 'P2034' || (typeof e?.message === 'string' && /serialize|40001/i.test(e.message))) {
        throw new BadRequestException({ message: 'Повторный голос заблокирован' });
      }
      throw e;
    }
  }

  async getStatus(userId: string | null, serverId: string, ip: string) {
    const cooldownAgo = new Date(Date.now() - COOLDOWN_MS);
    const cooldownOr: any[] = [{ ip }];
    if (userId) cooldownOr.push({ userId });

    const last = await this.prisma.vote.findFirst({
      where: {
        serverId,
        createdAt: { gt: cooldownAgo },
        OR: cooldownOr,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) return { voted: false, cooldownEnds: null };
    return { voted: true, cooldownEnds: new Date(last.createdAt.getTime() + COOLDOWN_MS) };
  }

  async checkExternalVote(serverId: string, rawNickname?: string) {
    const nickname = normalizeNickname(rawNickname);
    const since = new Date(Date.now() - COOLDOWN_MS);
    const vote = await this.prisma.vote.findFirst({
      where: {
        serverId,
        nickname: { equals: nickname, mode: 'insensitive' },
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return { voted: !!vote, timestamp: vote?.createdAt?.toISOString() ?? null };
  }

  // Сброс месячного счётчика оставлен для совместимости старой статистики.
  // totalVotes не сбрасывается: публично теперь показываем голоса за всё время.
  @Cron('0 0 1 * *')
  async resetMonthlyVotes() {
    await this.prisma.server.updateMany({ data: { monthlyVotes: 0, weeklyVotes: 0 } });
  }

  // Сервер недели остаётся недельным конкурсом.
  @Cron('0 3 * * 5')
  async resetWeeklyVotes() {
    await this.prisma.server.updateMany({ data: { weeklyVotes: 0 } });
  }
}
