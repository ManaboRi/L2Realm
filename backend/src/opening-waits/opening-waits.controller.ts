import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
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
}
