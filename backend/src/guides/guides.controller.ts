import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GuidesService } from './guides.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('guides')
export class GuidesController {
  constructor(private guides: GuidesService) {}

  // Публичный: список опубликованных гайдов (?chronicle=&category=).
  @Get()
  getPublic(@Query('chronicle') chronicle?: string, @Query('category') category?: string) {
    return this.guides.getPublic(chronicle, category);
  }

  // Публичный: счётчики по категориям для хроники (для хаба).
  @Get('counts')
  getCounts(@Query('chronicle') chronicle: string) {
    return this.guides.getCounts(chronicle);
  }

  // ── Admin ───────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  listAll() {
    return this.guides.listAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() body: any) {
    return this.guides.create(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.guides.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guides.remove(id);
  }

  // Публичный: детальная по slug (+просмотр). Внизу, чтобы не перехватывать спец-маршруты.
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.guides.getBySlug(slug, false);
  }

  @Get(':slug/view')
  getBySlugView(@Param('slug') slug: string) {
    return this.guides.getBySlug(slug, true);
  }
}
