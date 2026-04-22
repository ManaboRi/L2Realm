import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto, UpdateServerDto, FilterServersDto } from './dto/server.dto';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('servers')
@Controller('servers')
export class ServersController {
  constructor(private srv: ServersService) {}

  // ── Публичные ────────────────────────────────
  @Get()
  findAll(@Query() filters: FilterServersDto) {
    return this.srv.findAll(filters);
  }

  @Get('stats')
  stats() {
    return this.srv.getStats();
  }

  @Get('counts')
  filterCounts() {
    return this.srv.getFilterCounts();
  }

  @Get('coming-soon')
  comingSoon() {
    return this.srv.getComingSoon();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.srv.findOne(id);
  }

  // ── Заявка (только авторизованные, 1/24ч) ───
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('request')
  submitRequest(@Body() body: any, @Request() req: { user: { id: string } }) {
    return this.srv.submitRequest(req.user.id, body);
  }

  // ── Admin only ───────────────────────────────
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateServerDto) {
    return this.srv.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServerDto) {
    return this.srv.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.srv.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/requests')
  getRequests() {
    return this.srv.getRequests();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put('admin/requests/:id/status')
  updateRequestStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.srv.updateRequestStatus(id, body.status);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/requests/:id')
  deleteRequest(@Param('id') id: string) {
    return this.srv.deleteRequest(id);
  }
}
