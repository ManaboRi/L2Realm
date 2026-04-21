import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  // Создать покупку: kind=vip | boost
  @Post('purchase')
  purchase(@Body() body: { kind: 'vip' | 'boost'; serverId: string; returnUrl: string }) {
    return this.payments.createPurchase(body.kind, body.serverId, body.returnUrl);
  }

  // Webhook от ЮКасса
  @Post('webhook')
  webhook(@Body() body: any) {
    return this.payments.handleWebhook(body);
  }

  // Публичный статус VIP мест (для /pricing)
  @Get('vip/status')
  vipStatus() {
    return this.payments.getVipStatus();
  }

  // Активные бусты (публично, лёгкий эндпоинт для сортировки на фронте если понадобится)
  @Get('boosts/active')
  activeBoosts() {
    return this.payments.getActiveBoosts();
  }

  // Подписка конкретного сервера
  @Get('subscription/:serverId')
  getSubscription(@Param('serverId') id: string) {
    return this.payments.getSubscription(id);
  }

  // Активный буст конкретного сервера
  @Get('boost/:serverId')
  getBoost(@Param('serverId') id: string) {
    return this.payments.getActiveBoostFor(id);
  }

  // ── Admin ───────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  getAllSubs() {
    return this.payments.getAllSubscriptions();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('boosts/all')
  getAllBoosts() {
    return this.payments.getAllBoosts();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('vip/:serverId')
  grantVip(@Param('serverId') id: string) {
    return this.payments.activateVip(id, null);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('vip/:serverId')
  revokeVip(@Param('serverId') id: string) {
    return this.payments.removeVip(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('boost/:serverId')
  grantBoost(@Param('serverId') id: string) {
    return this.payments.activateBoost(id, null);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('boost/:serverId')
  revokeBoost(@Param('serverId') id: string) {
    return this.payments.removeBoost(id);
  }

  // Старый endpoint (оставлен для совместимости админки)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('activate')
  activate(@Body() body: { serverId: string; plan: string }) {
    return this.payments.adminActivate(body.serverId, body.plan);
  }
}
