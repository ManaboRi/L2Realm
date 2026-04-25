import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Req, ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  // Создать покупку: kind=vip | boost. Лимит 20 попыток/час с аккаунта
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('purchase')
  purchase(
    @Body() body: { kind: 'vip' | 'boost'; serverId: string; returnUrl: string },
    @Request() req: { user: { id: string; email: string } },
  ) {
    return this.payments.createPurchase(body.kind, body.serverId, body.returnUrl, req.user.email);
  }

  // Платное размещение «Скоро открытие» — 5 попыток/час с IP
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('purchase-soon')
  purchaseSoon(
    @Body() body: { name: string; chronicle: string; rates: string; url: string; openedDate: string; contact: string; returnUrl: string },
    @Req() req: ExpressRequest & { user: { id: string; email: string } },
  ) {
    const ip = req.ip || '';
    return this.payments.createSoonPurchase(req.user.id, req.user.email, ip, body.returnUrl, body);
  }

  // Webhook от ЮКассы:
  //   1. проверяем source IP (whitelist ЮКассы, https://yookassa.ru/developers/using-api/webhooks#ip)
  //   2. внутри handleWebhook — делаем GET /v3/payments/{id} и сверяем статус + сумму
  //
  // ВАЖНО: webhook должен приходить прямо на backend через nginx (отдельный location),
  // а не через frontend proxy — иначе X-Forwarded-For можно спуфить. В frontend proxy
  // этот путь заблокирован явно (см. frontend/src/app/api/proxy/[...path]/route.ts).
  //
  // req.ip — Express при `trust proxy: 1` возвращает реальный IP клиента относительно
  // первого доверенного прокси (nginx), игнорируя любые заспуфленные X-Forwarded-For до него.
  @SkipThrottle()
  @Post('webhook')
  webhook(
    @Body() body: any,
    @Req() req: ExpressRequest,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (!this.payments.isYookassaIp(ip)) {
      throw new ForbiddenException(`Webhook отклонён: IP ${ip} не в whitelist ЮКассы`);
    }
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
