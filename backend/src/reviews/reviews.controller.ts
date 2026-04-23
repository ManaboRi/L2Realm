import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get('server/:serverId')
  findByServer(@Param('serverId') serverId: string) {
    return this.reviews.findByServer(serverId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  findMine(@Request() req: { user: { id: string } }) {
    return this.reviews.findMine(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('server/:serverId')
  create(
    @Param('serverId') serverId: string,
    @Body() body: { rating: number; text: string },
    @Request() req,
  ) {
    return this.reviews.create(req.user.id, serverId, body.rating, body.text);
  }

  // Admin
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('pending')
  getPending() {
    return this.reviews.getPending();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.reviews.approve(id);
  }

  // Автор отзыва или админ. Роль проверяется в сервисе.
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string; role: string } }) {
    return this.reviews.remove(id, req.user.id, req.user.role);
  }

  // Пересчёт рейтингов после каскадного удаления юзеров (призрачные счётчики)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('recalc-all')
  recalcAll() {
    return this.reviews.recalcAllRatings();
  }
}
