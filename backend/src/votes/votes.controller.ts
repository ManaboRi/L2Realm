import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VotesService } from './votes.service';

async function optionalUserId(req: Request, jwt: JwtService, prisma: PrismaService): Promise<string | null> {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const payload = jwt.verify<{ sub?: string }>(match[1]);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

@Controller('votes')
export class VotesController {
  constructor(
    private readonly votes: VotesService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':serverId')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async vote(@Param('serverId') serverId: string, @Body() body: { nickname?: string }, @Req() req: Request) {
    const userId = await optionalUserId(req, this.jwt, this.prisma);
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.vote(userId, serverId, ip, body.nickname);
  }

  @Get(':serverId/status')
  async status(@Param('serverId') serverId: string, @Req() req: Request) {
    const userId = await optionalUserId(req, this.jwt, this.prisma);
    const ip = req.ip ?? '0.0.0.0';
    return this.votes.getStatus(userId, serverId, ip);
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
