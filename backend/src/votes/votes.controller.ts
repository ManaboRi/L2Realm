import { Controller, Post, Get, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { VotesService } from './votes.service';

@Controller('votes')
@UseGuards(AuthGuard('jwt'))
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Post(':serverId')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async vote(@Param('serverId') serverId: string, @Req() req: Request) {
    const user = req.user as any;
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.vote(user.id, serverId, ip);
  }

  @Get(':serverId/status')
  async status(@Param('serverId') serverId: string, @Req() req: Request) {
    const user = req.user as any;
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.getStatus(user.id, serverId, ip);
  }
}
