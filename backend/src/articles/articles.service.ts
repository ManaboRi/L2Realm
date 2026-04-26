import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ArticleDto {
  slug?:        string;
  title:        string;
  description:  string;
  content:      string;
  image?:       string | null;
  publishedAt?: string | null;
}

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
  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article) throw new NotFoundException('Статья не найдена');
    if (!article.publishedAt || article.publishedAt > new Date()) {
      throw new NotFoundException('Статья не найдена');
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
    if (!dto.title?.trim() || !dto.description?.trim() || !dto.content?.trim()) {
      throw new BadRequestException('title, description и content обязательны');
    }
    const slug = (dto.slug?.trim() || slugify(dto.title));

    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (exists) throw new ConflictException(`Статья со slug «${slug}» уже существует`);

    return this.prisma.article.create({
      data: {
        slug,
        title:       dto.title.trim(),
        description: dto.description.trim(),
        content:     dto.content,
        image:       dto.image?.trim() || null,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      },
    });
  }

  // ── Обновление (admin) ───────────────────────
  async update(id: string, dto: ArticleDto) {
    const existing = await this.findOneAdmin(id);

    // При смене slug — проверка уникальности
    let newSlug = existing.slug;
    if (dto.slug !== undefined) {
      newSlug = dto.slug.trim() || slugify(dto.title || existing.title);
      if (newSlug !== existing.slug) {
        const collision = await this.prisma.article.findUnique({ where: { slug: newSlug } });
        if (collision) throw new ConflictException(`slug «${newSlug}» уже занят`);
      }
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        slug:        newSlug,
        title:       dto.title?.trim() ?? existing.title,
        description: dto.description?.trim() ?? existing.description,
        content:     dto.content ?? existing.content,
        image:       dto.image === undefined
          ? existing.image
          : (dto.image?.trim() || null),
        publishedAt: dto.publishedAt === undefined
          ? existing.publishedAt
          : (dto.publishedAt ? new Date(dto.publishedAt) : null),
      },
    });
  }

  // ── Удаление (admin) ─────────────────────────
  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.article.delete({ where: { id } });
  }
}
