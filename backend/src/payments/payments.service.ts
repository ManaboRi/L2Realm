import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const PLAN_PRICES: Record<string, number> = {
  free:     0,
  standard: 1000,  // середина диапазона
  premium:  3500,
  vip:      10000,
};

const PLAN_DAYS: Record<string, number> = {
  free:     365,
  standard: 31,
  premium:  31,
  vip:      31,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // ── Создать платёж ЮКасса ───────────────────
  async createPayment(serverId: string, plan: string, returnUrl: string) {
    const amount   = PLAN_PRICES[plan] || 0;
    const shopId   = this.config.get('YOOKASSA_SHOP_ID');
    const secretKey = this.config.get('YOOKASSA_SECRET_KEY');

    // Для бесплатного тарифа — сразу активируем
    if (plan === 'free' || amount === 0) {
      return this.activateSubscription(serverId, plan, null);
    }

    if (!shopId || !secretKey) {
      // В dev-режиме без ключей просто активируем
      this.logger.warn('ЮКасса не настроена — активируем подписку без оплаты (dev mode)');
      return this.activateSubscription(serverId, plan, 'dev-' + uuidv4());
    }

    // Создаём платёж в ЮКассе
    const idempotenceKey = uuidv4();
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount:       { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description:  `L2Realm подписка ${plan} для сервера ${serverId}`,
        metadata:     { serverId, plan },
        capture:      true,
      },
      {
        auth:    { username: shopId, password: secretKey },
        headers: { 'Idempotence-Key': idempotenceKey },
      },
    );

    return {
      paymentId:       response.data.id,
      confirmationUrl: response.data.confirmation.confirmation_url,
      status:          response.data.status,
      amount,
    };
  }

  // ── Callback от ЮКасса ──────────────────────
  async handleWebhook(body: any) {
    const { type, object } = body;

    if (type === 'payment.succeeded') {
      const { serverId, plan } = object.metadata || {};
      if (serverId && plan) {
        await this.activateSubscription(serverId, plan, object.id);
        this.logger.log(`✅ Оплата ${plan} для ${serverId} прошла успешно`);
      }
    }

    return { ok: true };
  }

  // ── Активировать подписку ────────────────────
  async activateSubscription(serverId: string, plan: string, paymentId: string | null) {
    const planKey  = plan.toUpperCase() as SubscriptionPlan;
    const days     = PLAN_DAYS[plan.toLowerCase()] || 30;
    const endDate  = new Date();
    endDate.setDate(endDate.getDate() + days);
    const isVip    = plan.toLowerCase() === 'vip';

    try {
      await this.prisma.subscription.upsert({
        where:  { serverId },
        create: { serverId, plan: planKey, startDate: new Date(), endDate, paid: true, ...(paymentId && { paymentId }) },
        update: { plan: planKey, startDate: new Date(), endDate, paid: true, ...(paymentId && { paymentId }) },
      });

      await this.prisma.server.update({
        where: { id: serverId },
        data:  { vip: isVip },
      });
    } catch (err: any) {
      this.logger.error(`activateSubscription error: ${err.message}`, err.stack);
      throw err;
    }

    return { success: true, serverId, plan: planKey, endDate };
  }

  // ── Статус подписки ──────────────────────────
  async getSubscription(serverId: string) {
    return this.prisma.subscription.findUnique({ where: { serverId } });
  }

  // ── Все подписки (admin) ─────────────────────
  async getAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: { server: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
