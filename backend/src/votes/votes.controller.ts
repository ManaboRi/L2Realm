import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { VotesService } from './votes.service';

@Controller('votes')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  // Голосование анонимное: лимит — один голос с IP в сутки (см. VotesService).
  @Post(':serverId')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async vote(@Param('serverId') serverId: string, @Body() body: { nickname?: string }, @Req() req: Request) {
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.vote(null, serverId, ip, body.nickname);
  }

  @Get(':serverId/status')
  async status(@Param('serverId') serverId: string, @Req() req: Request) {
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.getStatus(null, serverId, ip);
  }

  @Get(':serverId/summary')
  async summary(@Param('serverId') serverId: string) {
    return this.votes.getSummary(serverId);
  }
}

@Controller('vote')
export class VotePublicController {
  constructor(private readonly votes: VotesService) {}

  @Get('check')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async check(@Query('server_id') serverId: string, @Query('nickname') nickname: string) {
    return this.votes.checkExternalVote(serverId, nickname);
  }
}
