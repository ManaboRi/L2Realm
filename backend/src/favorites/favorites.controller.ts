import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('favorites')
export class FavoritesController {
  constructor(private favs: FavoritesService) {}

  @Get()
  listMine(@Request() req: { user: { id: string } }) {
    return this.favs.listMine(req.user.id);
  }

  @Get('ids')
  listIds(@Request() req: { user: { id: string } }) {
    return this.favs.listIds(req.user.id);
  }

  @Post(':serverId')
  add(@Param('serverId') serverId: string, @Request() req: { user: { id: string } }) {
    return this.favs.add(req.user.id, serverId);
  }

  @Delete(':serverId')
  remove(@Param('serverId') serverId: string, @Request() req: { user: { id: string } }) {
    return this.favs.remove(req.user.id, serverId);
  }
}
