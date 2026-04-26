import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ArticlesService, ArticleDto } from './articles.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private articles: ArticlesService) {}

  // ── Публичные ────────────────────────────────
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get()
  list() {
    return this.articles.findPublished();
  }

  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.articles.findBySlug(slug);
  }

  // ── Admin only ───────────────────────────────
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  adminList() {
    return this.articles.findAllAdmin();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/by-id/:id')
  adminOne(@Param('id') id: string) {
    return this.articles.findOneAdmin(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: ArticleDto) {
    return this.articles.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: ArticleDto) {
    return this.articles.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }
}
