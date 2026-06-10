import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Транслитерация кириллицы для авто-slug.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .split('')
    .map(ch => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'guide';
}

// Поля для публичного списка (без тяжёлого content).
const LIST_SELECT = {
  id: true, slug: true, chronicle: true, category: true, title: true,
  description: true, image: true, levelMin: true, levelMax: true,
  npc: true, location: true, reward: true, views: true, publishedAt: true,
} as const;

@Injectable()
export class GuidesService {
  constructor(private prisma: PrismaService) {}

  // Публичный список опубликованных гайдов (фильтр по хронике/категории).
  async getPublic(chronicle?: string, category?: string) {
    return this.prisma.guide.findMany({
      where: {
        publishedAt: { not: null },
        ...(chronicle ? { chronicle } : {}),
        ...(category ? { category } : {}),
      },
      select: LIST_SELECT,
      orderBy: [{ sort: 'asc' }, { levelMin: 'asc' }, { publishedAt: 'desc' }],
    });
  }

  // Счётчики опубликованных гайдов по категориям для одной хроники (для хаба).
  async getCounts(chronicle: string) {
    const rows = await this.prisma.guide.groupBy({
      by: ['category'],
      where: { chronicle, publishedAt: { not: null } },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.category] = r._count._all;
    return counts;
  }

  // Детальная страница по slug (+опционально засчитать просмотр).
  async getBySlug(slug: string, countView = false) {
    const guide = await this.prisma.guide.findFirst({
      where: { slug, publishedAt: { not: null } },
    });
    if (!guide) throw new NotFoundException('Гайд не найден');
    if (countView) {
      await this.prisma.guide.updateMany({ where: { id: guide.id }, data: { views: { increment: 1 } } });
    }
    return guide;
  }

  // ── Admin ───────────────────────────────────
  async listAll() {
    return this.prisma.guide.findMany({
      orderBy: [{ chronicle: 'asc' }, { category: 'asc' }, { sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let n = 1;
    // Подбираем свободный slug.
    while (true) {
      const found = await this.prisma.guide.findUnique({ where: { slug: candidate } });
      if (!found || found.id === ignoreId) return candidate;
      n += 1;
      candidate = `${root}-${n}`;
    }
  }

  private numOrNull(v: any): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  async create(data: any) {
    const slug = await this.uniqueSlug(data.slug || data.title || 'guide');
    return this.prisma.guide.create({
      data: {
        slug,
        chronicle: String(data.chronicle ?? 'interlude'),
        category: String(data.category ?? 'novichkam'),
        title: String(data.title ?? '').slice(0, 160),
        description: data.description ? String(data.description).slice(0, 320) : '',
        content: data.content ? String(data.content) : '',
        image: data.image ? String(data.image) : null,
        levelMin: this.numOrNull(data.levelMin),
        levelMax: this.numOrNull(data.levelMax),
        npc: data.npc ? String(data.npc).slice(0, 80) : null,
        location: data.location ? String(data.location).slice(0, 80) : null,
        reward: data.reward ? String(data.reward).slice(0, 120) : null,
        sort: this.numOrNull(data.sort) ?? 0,
        publishedAt: data.published ? new Date() : null,
      },
    });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.guide.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Гайд не найден');
    // slug меняем только если явно прислали новый непустой.
    const slug = data.slug && data.slug !== exists.slug
      ? await this.uniqueSlug(data.slug, id)
      : undefined;
    return this.prisma.guide.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(data.chronicle !== undefined && { chronicle: String(data.chronicle) }),
        ...(data.category !== undefined && { category: String(data.category) }),
        ...(data.title !== undefined && { title: String(data.title).slice(0, 160) }),
        ...(data.description !== undefined && { description: data.description ? String(data.description).slice(0, 320) : '' }),
        ...(data.content !== undefined && { content: data.content ? String(data.content) : '' }),
        ...(data.image !== undefined && { image: data.image ? String(data.image) : null }),
        ...(data.levelMin !== undefined && { levelMin: this.numOrNull(data.levelMin) }),
        ...(data.levelMax !== undefined && { levelMax: this.numOrNull(data.levelMax) }),
        ...(data.npc !== undefined && { npc: data.npc ? String(data.npc).slice(0, 80) : null }),
        ...(data.location !== undefined && { location: data.location ? String(data.location).slice(0, 80) : null }),
        ...(data.reward !== undefined && { reward: data.reward ? String(data.reward).slice(0, 120) : null }),
        ...(data.sort !== undefined && { sort: this.numOrNull(data.sort) ?? 0 }),
        ...(data.published !== undefined && { publishedAt: data.published ? (exists.publishedAt ?? new Date()) : null }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.guide.deleteMany({ where: { id } });
    return { ok: true };
  }
}
