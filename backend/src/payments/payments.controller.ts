import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  // Создать платёж для сервера
  @Post('create')
  create(@Body() body: { serverId: string; plan: string; returnUrl: string }) {
    return this.payments.createPayment(body.serverId, body.plan, body.returnUrl);
  }

  // Webhook от ЮКасса
  @Post('webhook')
  webhook(@Body() body: any) {
    return this.payments.handleWebhook(body);
  }

  // Статус подписки
  @Get('subscription/:serverId')
  getSubscription(@Param('serverId') id: string) {
    return this.payments.getSubscription(id);
  }

  // Все подписки (admin)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  getAll() {
    return this.payments.getAllSubscriptions();
  }

  // Ручная активация (admin)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('activate')
  activate(@Body() body: { serverId: string; plan: string }) {
    return this.payments.activateSubscription(body.serverId, body.plan, null);
  }
}
