import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { BannersService } from './banners.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('banners')
export class BannersController {
  constructor(private banners: BannersService) {}

  // Публичный: активные баннеры для показа на сайте.
  @Get('active')
  getActive() {
    return this.banners.getActive();
  }

  // Публичный: счётчик клика по баннеру.
  @Post(':id/click')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  click(@Param('id') id: string) {
    return this.banners.registerClick(id);
  }

  // ── Admin ───────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  listAll() {
    return this.banners.listAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() body: any) {
    return this.banners.create(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.banners.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
