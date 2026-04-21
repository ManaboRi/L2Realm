import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByServer(serverId: string) {
    return this.prisma.review.findMany({
      where: { serverId, approved: true },
      include: { user: { select: { id: true, name: true, nickname: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { server: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 1 аккаунт = 1 отзыв на сервер; повторный вызов редактирует существующий
  async create(userId: string, serverId: string, rating: number, text: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');

    const review = await this.prisma.review.upsert({
      where:  { userId_serverId: { userId, serverId } },
      create: { userId, serverId, rating, text, approved: false },
      update: { rating, text, approved: false }, // при редактировании снова на модерацию
      include: { user: { select: { id: true, name: true, nickname: true, avatar: true } } },
    });

    await this.recalcRating(serverId);
    return review;
  }

  async approve(id: string) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { approved: true },
    });
    await this.recalcRating(review.serverId);
    return review;
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException();
    await this.prisma.review.delete({ where: { id } });
    await this.recalcRating(review.serverId);
    return { deleted: true };
  }

  async getPending() {
    return this.prisma.review.findMany({
      where: { approved: false },
      include: {
        user:   { select: { id: true, name: true, nickname: true, email: true } },
        server: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async recalcRating(serverId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { serverId, approved: true },
      select: { rating: true },
    });
    const count = reviews.length;
    const avg   = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    await this.prisma.server.update({
      where: { id: serverId },
      data:  { rating: avg, ratingCount: count },
    });
  }
}
