import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private monitoring: MonitoringService) {}

  @Get(':serverId')
  getStatus(@Param('serverId') id: string) {
    return this.monitoring.getStatus(id);
  }

  @Get(':serverId/uptime')
  getUptime(@Param('serverId') id: string, @Query('days') days = '7') {
    return this.monitoring.getUptimeStats(id, Number(days));
  }

  @Get(':serverId/daily')
  getDaily(@Param('serverId') id: string, @Query('days') days = '30') {
    return this.monitoring.getDailyStats(id, Number(days));
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post(':serverId/check')
  checkNow(@Param('serverId') id: string) {
    return this.monitoring.checkServer(id);
  }
}
