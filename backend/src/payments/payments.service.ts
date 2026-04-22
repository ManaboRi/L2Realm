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
  async createPurchase(kind: PurchaseKind, serverId: string, returnUrl: string, userEmail: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');
    if (!userEmail) throw new BadRequestException('Email покупателя обязателен для чека');

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

    if (!shopId || !secretKey) {
      // В проде без ключей — ошибка, не халява. В dev — активируем сразу для локальной разработки.
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Платежи временно недоступны. Обратитесь в поддержку.');
      }
      this.logger.warn(`ЮКасса не настроена — активируем ${kind} сразу (dev mode, NODE_ENV=${process.env.NODE_ENV})`);
      const result = kind === 'vip'
        ? await this.activateVip(serverId, 'dev-' + uuidv4())
        : await this.activateBoost(serverId, 'dev-' + uuidv4());
      return { dev: true, activated: true, ...result };
    }

    const description = kind === 'vip'
      ? `L2Realm VIP (${VIP_DAYS} дней) для «${server.name}»`
      : `L2Realm Буст (${BOOST_DAYS} дней) для «${server.name}»`;

    const idempotenceKey = uuidv4();
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount:       { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description,
        metadata:     { serverId, kind },
        capture:      true,
        // Чек по 54-ФЗ — обязательный, ЮКасса передаст его в «Мой налог» для самозанятых
        receipt: {
          customer: { email: userEmail },
          items: [{
            description,
            quantity:        '1.00',
            amount:          { value: amount.toFixed(2), currency: 'RUB' },
            vat_code:        1,                 // 1 = без НДС (самозанятый)
            payment_mode:    'full_prepayment',
            payment_subject: 'service',
          }],
        },
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

  // ── Whitelist IP ЮКассы для webhook ──────────
  // Актуальный список: https://yookassa.ru/developers/using-api/webhooks#ip
  private static readonly YOOKASSA_IP_RANGES = [
    '185.71.76.0/27',
    '185.71.77.0/27',
    '77.75.153.0/25',
    '77.75.154.128/25',
    '77.75.156.11/32',
    '77.75.156.35/32',
  ];

  isYookassaIp(ip: string): boolean {
    if (!ip) return false;
    // snake через nginx/traefik приходит как ::ffff:x.x.x.x
    const addr = ip.replace(/^::ffff:/, '');
    for (const range of PaymentsService.YOOKASSA_IP_RANGES) {
      if (ipInCidr(addr, range)) return true;
    }
    return false;
  }

  // ── Webhook от ЮКассы ────────────────────────
  // Мы НЕ доверяем body — после уведомления идём в ЮКассу через API и сверяем
  // статус, сумму, metadata. Это защищает от подмены тела и от повторов.
  async handleWebhook(body: any) {
    const { type, object } = body;
    if (type !== 'payment.succeeded' && type !== 'refund.succeeded' && type !== 'payment.canceled') {
      return { ok: true };
    }
    if (type !== 'payment.succeeded') {
      this.logger.log(`ℹ️ Получено событие ${type} (payment ${object?.id}), игнорируем`);
      return { ok: true };
    }

    const paymentId = object?.id;
    if (!paymentId) return { ok: true };

    // 1. Идемпотентность — если этот paymentId уже обработан, игнорируем
    const alreadyProcessed = await this.isPaymentProcessed(paymentId);
    if (alreadyProcessed) {
      this.logger.log(`ℹ️ Платёж ${paymentId} уже обработан, повторный webhook проигнорирован`);
      return { ok: true };
    }

    // 2. Независимая проверка через API ЮКассы (не доверяем body)
    const verified = await this.fetchPaymentFromYookassa(paymentId);
    if (!verified) {
      this.logger.warn(`⚠️ Не удалось получить платёж ${paymentId} из ЮКассы — отклоняем webhook`);
      return { ok: true };
    }

    if (verified.status !== 'succeeded' || !verified.paid) {
      this.logger.warn(`⚠️ Платёж ${paymentId} не в статусе succeeded (${verified.status}) — пропускаем`);
      return { ok: true };
    }

    const { serverId, kind } = verified.metadata || {};
    if (!serverId || (kind !== 'vip' && kind !== 'boost')) {
      this.logger.warn(`⚠️ Платёж ${paymentId}: отсутствует или некорректна metadata`);
      return { ok: true };
    }

    // 3. Проверка суммы — защита от подмены amount
    const expected = kind === 'vip' ? VIP_PRICE : BOOST_PRICE;
    const actualRub = parseFloat(verified.amount?.value);
    if (verified.amount?.currency !== 'RUB' || actualRub !== expected) {
      this.logger.error(
        `🚨 Платёж ${paymentId}: сумма не совпала (ожидали ${expected} RUB, пришло ${verified.amount?.value} ${verified.amount?.currency}) — НЕ активируем`,
      );
      return { ok: true };
    }

    // 4. Активация
    if (kind === 'vip') {
      await this.activateVip(serverId, paymentId);
      this.logger.log(`✅ VIP активирован для ${serverId} (payment ${paymentId}, ${actualRub} RUB)`);
    } else {
      await this.activateBoost(serverId, paymentId);
      this.logger.log(`✅ Буст активирован для ${serverId} (payment ${paymentId}, ${actualRub} RUB)`);
    }

    return { ok: true };
  }

  // ── GET /v3/payments/{id} — прямая проверка у ЮКассы ──
  private async fetchPaymentFromYookassa(paymentId: string) {
    const shopId    = this.config.get('YOOKASSA_SHOP_ID');
    const secretKey = this.config.get('YOOKASSA_SECRET_KEY');
    if (!shopId || !secretKey) return null;

    try {
      const { data } = await axios.get(
        `https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`,
        { auth: { username: shopId, password: secretKey }, timeout: 10_000 },
      );
      return data;
    } catch (e: any) {
      this.logger.error(`Ошибка запроса к ЮКассе для ${paymentId}: ${e.message}`);
      return null;
    }
  }

  // ── Проверка идемпотентности ──────────────────
  // Если paymentId уже сохранён в Subscription или Boost — значит обработан
  private async isPaymentProcessed(paymentId: string): Promise<boolean> {
    const [sub, boost] = await Promise.all([
      this.prisma.subscription.findFirst({ where: { paymentId } }),
      this.prisma.boost.findFirst({ where: { paymentId } }),
    ]);
    return !!sub || !!boost;
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

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const ipInt    = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
