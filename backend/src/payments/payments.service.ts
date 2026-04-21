import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const VIP_PRICE   = 5000;
export const VIP_DAYS    = 31;
export const VIP_MAX     = 3;
export const BOOST_PRICE = 250;
export const BOOST_DAYS  = 7;

type PurchaseKind = 'vip' | 'boost';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // ── Создать платёж (VIP или буст) ─────────────
  async createPurchase(kind: PurchaseKind, serverId: string, returnUrl: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');

    const amount = kind === 'vip' ? VIP_PRICE : BOOST_PRICE;

    if (kind === 'vip') {
      const status = await this.getVipStatus();
      const already = await this.prisma.subscription.findUnique({ where: { serverId } });
      if (already?.plan === 'VIP' && already.endDate > new Date()) {
        throw new BadRequestException('У сервера уже активен VIP');
      }
      if (status.taken >= VIP_MAX) {
        throw new BadRequestException(
          `Все ${VIP_MAX} VIP-места заняты. Ближайшее освободится ${status.nextFreeAt?.toISOString()}`,
        );
      }
    }

    const shopId    = this.config.get('YOOKASSA_SHOP_ID');
    const secretKey = this.config.get('YOOKASSA_SECRET_KEY');

    // dev-mode без ключей ЮКассы: сразу активируем
    if (!shopId || !secretKey) {
      this.logger.warn(`ЮКасса не настроена — активируем ${kind} сразу (dev mode)`);
      const result = kind === 'vip'
        ? await this.activateVip(serverId, 'dev-' + uuidv4())
        : await this.activateBoost(serverId, 'dev-' + uuidv4());
      return { dev: true, activated: true, ...result };
    }

    const idempotenceKey = uuidv4();
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount:       { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description:  kind === 'vip'
          ? `L2Realm VIP (${VIP_DAYS} дней) для «${server.name}»`
          : `L2Realm Буст 🔥 (${BOOST_DAYS} дней) для «${server.name}»`,
        metadata:     { serverId, kind },
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
      kind,
    };
  }

  // ── Webhook от ЮКассы ────────────────────────
  async handleWebhook(body: any) {
    const { type, object } = body;
    if (type !== 'payment.succeeded') return { ok: true };

    const { serverId, kind } = object.metadata || {};
    if (!serverId || !kind) return { ok: true };

    if (kind === 'vip') {
      await this.activateVip(serverId, object.id);
      this.logger.log(`✅ VIP активирован для ${serverId} (payment ${object.id})`);
    } else if (kind === 'boost') {
      await this.activateBoost(serverId, object.id);
      this.logger.log(`✅ Буст активирован для ${serverId} (payment ${object.id})`);
    }

    return { ok: true };
  }

  // ── Активация VIP ─────────────────────────────
  async activateVip(serverId: string, paymentId: string | null) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + VIP_DAYS);

    await this.prisma.subscription.upsert({
      where:  { serverId },
      create: { serverId, plan: 'VIP', startDate: new Date(), endDate, paid: !!paymentId, ...(paymentId && { paymentId }) },
      update: { plan: 'VIP', startDate: new Date(), endDate, paid: !!paymentId, ...(paymentId && { paymentId }) },
    });
    await this.prisma.server.update({ where: { id: serverId }, data: { vip: true } });

    return { ok: true, serverId, kind: 'vip', endDate };
  }

  // ── Снятие VIP вручную (admin) ────────────────
  async removeVip(serverId: string) {
    await this.prisma.subscription.upsert({
      where:  { serverId },
      create: { serverId, plan: 'FREE', startDate: new Date(), endDate: farFuture(), paid: false },
      update: { plan: 'FREE', endDate: farFuture(), paid: false },
    });
    await this.prisma.server.update({ where: { id: serverId }, data: { vip: false } });
    return { ok: true };
  }

  // ── Активация буста (upsert с продлением) ─────
  async activateBoost(serverId: string, paymentId: string | null) {
    const now = new Date();
    const active = await this.prisma.boost.findFirst({
      where: { serverId, endDate: { gt: now } },
      orderBy: { endDate: 'desc' },
    });

    const base = active ? active.endDate : now;
    const endDate = new Date(base);
    endDate.setDate(endDate.getDate() + BOOST_DAYS);

    const boost = active
      ? await this.prisma.boost.update({
          where: { id: active.id },
          data:  { endDate, paid: active.paid || !!paymentId, ...(paymentId && { paymentId }) },
        })
      : await this.prisma.boost.create({
          data: { serverId, startDate: now, endDate, paid: !!paymentId, ...(paymentId && { paymentId }) },
        });

    return { ok: true, serverId, kind: 'boost', endDate: boost.endDate };
  }

  // ── Снятие буста вручную (admin) ──────────────
  async removeBoost(serverId: string) {
    await this.prisma.boost.deleteMany({ where: { serverId, endDate: { gt: new Date() } } });
    return { ok: true };
  }

  // ── Статус VIP мест (публично) ────────────────
  async getVipStatus() {
    const now = new Date();
    const active = await this.prisma.subscription.findMany({
      where: { plan: 'VIP', endDate: { gt: now } },
      orderBy: { endDate: 'asc' },
      include: { server: { select: { id: true, name: true, icon: true } } },
    });
    const taken = active.length;
    const free  = Math.max(0, VIP_MAX - taken);
    const nextFreeAt = taken >= VIP_MAX ? active[0]?.endDate ?? null : null;
    return { taken, free, max: VIP_MAX, nextFreeAt, slots: active };
  }

  // ── Активные бусты (публично, для сортировки) ─
  async getActiveBoosts() {
    return this.prisma.boost.findMany({
      where: { endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });
  }

  // ── Подписка конкретного сервера ──────────────
  async getSubscription(serverId: string) {
    return this.prisma.subscription.findUnique({ where: { serverId } });
  }

  // ── Активный буст конкретного сервера ─────────
  async getActiveBoostFor(serverId: string) {
    return this.prisma.boost.findFirst({
      where: { serverId, endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });
  }

  // ── Все подписки (admin) ──────────────────────
  async getAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: { server: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Все бусты (admin) ─────────────────────────
  async getAllBoosts() {
    return this.prisma.boost.findMany({
      include: { server: { select: { id: true, name: true, icon: true } } },
      orderBy: { endDate: 'desc' },
    });
  }

  // ── Ручная активация планом (admin, legacy) ──
  async adminActivate(serverId: string, plan: string) {
    const planKey = plan.toUpperCase() as SubscriptionPlan;
    if (planKey === 'VIP') return this.activateVip(serverId, null);
    if (planKey === 'FREE') return this.removeVip(serverId);
    throw new BadRequestException('Поддерживаются только FREE и VIP');
  }
}

function farFuture() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 100);
  return d;
}
