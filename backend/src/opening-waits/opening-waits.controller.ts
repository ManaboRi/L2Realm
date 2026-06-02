import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { OpeningWaitsService } from './opening-waits.service';

@Controller('opening-waits')
export class OpeningWaitsController {
  constructor(private readonly waits: OpeningWaitsService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  wait(@Body() body: { serverId?: string; instanceId?: string | null }, @Req() req: Request) {
    return this.waits.wait(String(body.serverId || ''), body.instanceId, req.ip ?? '0.0.0.0');
  }

  @Get('status')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  status(@Query('keys') keys: string | string[] | undefined, @Req() req: Request) {
    return this.waits.status(keys, req.ip ?? '0.0.0.0');
  }

  @Get('top')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  top(@Query('limit') limit?: string) {
    return this.waits.top(Number(limit || 5));
  }

  @Post('click')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  click(@Body() body: { serverId?: string; instanceId?: string | null }, @Req() req: Request) {
    return this.waits.click(
      String(body.serverId || ''),
      body.instanceId,
      req.ip ?? '0.0.0.0',
      req.headers['user-agent'],
      req.headers.referer || req.headers.referrer,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/clicks')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  clicks(@Query('days') days?: string) {
    return this.waits.clickReport(Number(days || 30));
  }
}
