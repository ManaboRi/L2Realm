import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OpeningRemindersService } from './opening-reminders.service';

@ApiTags('opening-reminders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('opening-reminders')
export class OpeningRemindersController {
  constructor(private reminders: OpeningRemindersService) {}

  @Get('keys')
  keys(@Request() req: { user: { id: string } }) {
    return this.reminders.keys(req.user.id);
  }

  @Get('due')
  due(@Request() req: { user: { id: string } }) {
    return this.reminders.due(req.user.id);
  }

  @Post()
  add(
    @Request() req: { user: { id: string } },
    @Body() body: { serverId: string; instanceId?: string | null },
  ) {
    return this.reminders.add(req.user.id, body.serverId, body.instanceId);
  }

  @Delete(':serverId')
  remove(
    @Request() req: { user: { id: string } },
    @Param('serverId') serverId: string,
    @Query('instanceId') instanceId?: string,
  ) {
    return this.reminders.remove(req.user.id, serverId, instanceId);
  }
}
