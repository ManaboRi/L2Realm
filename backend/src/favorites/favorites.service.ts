import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  // Список избранного пользователя (с инфой о серверах)
  async listMine(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        server: {
          select: {
            id: true, name: true, icon: true, chronicle: true, rates: true,
            rating: true, ratingCount: true, status: true, openedDate: true,
          },
        },
      },
    });
  }

  // Только список ID серверов — для кнопки «В избранном»
  async listIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { serverId: true },
    });
    return rows.map(r => r.serverId);
  }

  async add(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');
    try {
      return await this.prisma.favorite.create({ data: { userId, serverId } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Уже в избранном');
      throw e;
    }
  }

  async remove(userId: string, serverId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, serverId } });
    return { ok: true };
  }
}
