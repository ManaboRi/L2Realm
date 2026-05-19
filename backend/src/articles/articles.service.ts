import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dateString, optionalSafeAssetUrl, parseOrThrow, safeMarkdownText, safeSlug, safeText } from '../common/input-validation';
import { z } from 'zod';

export interface ArticleDto {
  slug?:        string;
  title:        string;
  description:  string;
  content:      string;
  image?:       string | null;
  category?:    string | null;
  publishedAt?: string | null;
}

const articleSchema = z.object({
  slug: safeSlug.optional(),
  title: safeText(3, 140),
  description: safeText(20, 320),
  content: safeMarkdownText(20, 60_000),
  image: optionalSafeAssetUrl,
  category: safeText(2, 40).optional(),
  publishedAt: z.union([dateString, z.literal(''), z.null()]).optional().transform(value => value || null),
});

const articleUpdateSchema = articleSchema.partial();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[а-яё]/g, c => ({
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',
      н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
      ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
    } as Record<string, string>)[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'article';
}

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  // ── Публичный список (только опубликованные) ─
  async findPublished() {
    return this.prisma.article.findMany({
      where:   { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // ── Публичная одна (только опубликованная) ───
  async findBySlug(slug: string, incrementView = false) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article) throw new NotFoundException('Статья не найдена');
    if (!article.publishedAt || article.publishedAt > new Date()) {
      throw new NotFoundException('Статья не найдена');
    }
    if (incrementView) {
      return this.prisma.article.update({
        where: { id: article.id },
        data: { views: { increment: 1 } },
      });
    }
    return article;
  }

  // ── Список ВСЕХ для админки (включая черновики) ─
  async findAllAdmin() {
    return this.prisma.article.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneAdmin(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Статья не найдена');
    return article;
  }

  // ── Создание (admin) ─────────────────────────
  async create(dto: ArticleDto) {
    const clean = parseOrThrow(articleSchema, dto);
    const slug = (clean.slug || slugify(clean.title));

    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (exists) throw new ConflictException(`Статья со slug «${slug}» уже существует`);

    return this.prisma.article.create({
      data: {
        slug,
        title:       clean.title,
        description: clean.description,
        content:     clean.content,
        image:       clean.image,
        category:    clean.category || 'Новости',
        publishedAt: clean.publishedAt ? new Date(clean.publishedAt) : null,
      },
    });
  }

  // ── Обновление (admin) ───────────────────────
  async update(id: string, dto: ArticleDto) {
    const existing = await this.findOneAdmin(id);
    const clean = parseOrThrow(articleUpdateSchema, dto);

    // При смене slug — проверка уникальности
    let newSlug = existing.slug;
    if (clean.slug !== undefined || dto.slug !== undefined) {
      newSlug = clean.slug || slugify(clean.title || existing.title);
      if (newSlug !== existing.slug) {
        const collision = await this.prisma.article.findUnique({ where: { slug: newSlug } });
        if (collision) throw new ConflictException(`slug «${newSlug}» уже занят`);
      }
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        slug:        newSlug,
        title:       clean.title ?? existing.title,
        description: clean.description ?? existing.description,
        content:     clean.content ?? existing.content,
        image:       dto.image === undefined
          ? existing.image
          : clean.image,
        category:    dto.category === undefined
          ? existing.category
          : (clean.category || 'Новости'),
        publishedAt: dto.publishedAt === undefined
          ? existing.publishedAt
          : (clean.publishedAt ? new Date(clean.publishedAt) : null),
      },
    });
  }

  // ── Удаление (admin) ─────────────────────────
  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.article.delete({ where: { id } });
  }
}
