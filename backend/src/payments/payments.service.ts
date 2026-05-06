import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { dateString, parseOrThrow, safeIp, safeSlug, safeText, safeUrl } from '../common/input-validation';
import { z } from 'zod';

export const VIP_PRICE         = 5000;
export const VIP_DAYS          = 31;
export const VIP_MAX           = 5;
export const BOOST_PRICE       = 500;
export const BOOST_DAYS        = 7;
export const COMING_SOON_PRICE = 500;
export const SOON_VIP_PRICE    = 2000;
export const SOON_VIP_MAX      = 5;

type PurchaseKind = 'vip' | 'boost' | 'soon_vip';

const returnUrlSchema = safeUrl.refine(value => {
  if (process.env.NODE_ENV !== 'production') return true;
  const url = new URL(value);
  return url.origin === 'https://l2realm.ru';
}, 'Return URL must point to https://l2realm.ru');

const purchaseSchema = z.object({
  kind: z.enum(['vip', 'boost', 'soon_vip']),
  serverId: safeSlug.max(64),
  returnUrl: returnUrlSchema,
  userEmail: z.string().trim().email(),
  instanceId: z.union([safeText(1, 80), z.literal(''), z.null()]).optional().transform(value => value || null),
});

const soonPurchaseSchema = z.object({
  name: safeText(2, 80),
  chronicle: safeText(1, 80),
  rates: safeText(1, 40),
  url: safeUrl,
  openedDate: dateString,
  contact: safeText(2, 120),
});

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // ── Создать платёж (VIP или буст) ─────────────
  async createPurchase(kind: PurchaseKind, serverId: string, returnUrl: string, userEmail: string, instanceId?: string | null) {
    const clean = parseOrThrow(purchaseSchema, { kind, serverId, returnUrl, userEmail, instanceId });
    kind = clean.kind;
    serverId = clean.serverId;
    returnUrl = clean.returnUrl;
    userEmail = clean.userEmail;
    instanceId = clean.instanceId;
    const server = await this.prisma.server.findUnique({ where: { id: serverId }, include: { subscription: true } });
    if (!server) throw new NotFoundException('Сервер не найден');
    if (!userEmail) throw new BadRequestException('Email покупателя обязателен для чека');

    const soonOpening = kind === 'soon_vip'
      ? findSoonOpening(server, instanceId)
      : null;
    const isComingSoon = kind === 'soon_vip'
      ? !!soonOpening
      : isOnlyComingSoonServer(server);

    // Серверы с датой открытия в будущем — обычные VIP/буст продаются только после открытия.
    if (isComingSoon && kind !== 'soon_vip') {
      const opens = nextOpeningDate(server)?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) ?? 'позже';
      throw new BadRequestException(
        `Сервер ещё не открыт (откроется ${opens}). Покупка VIP и буста доступна только для открытых серверов.`,
      );
    }
    if (!isComingSoon && kind === 'soon_vip') {
      throw new BadRequestException('VIP в «Скоро открытие» доступен только для серверов с будущей датой открытия');
    }

    const amount = kind === 'vip' ? VIP_PRICE : kind === 'soon_vip' ? SOON_VIP_PRICE : BOOST_PRICE;

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
    if (kind === 'soon_vip') {
      const status = await this.getSoonVipStatus();
      if (!soonOpening) {
        throw new BadRequestException('Выберите запуск из «Скоро открытие»');
      }
      if (isSoonOpeningVipActive(server, soonOpening.instanceId)) {
        throw new BadRequestException('У этого запуска уже активен VIP в «Скоро открытие»');
      }
      if (status.taken >= SOON_VIP_MAX) {
        throw new BadRequestException(
          `Все ${SOON_VIP_MAX} VIP-места в «Скоро открытие» заняты. Ближайшее освободится ${status.nextFreeAt?.toISOString()}`,
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
      const paymentId = 'dev-' + uuidv4();
      const result = kind === 'soon_vip'
        ? await this.activateSoonVip(serverId, paymentId, soonOpening?.instanceId)
        : kind === 'vip'
          ? await this.activateVip(serverId, paymentId)
          : await this.activateBoost(serverId, paymentId);
      return { dev: true, activated: true, ...result };
    }

    const description = kind === 'vip'
      ? `L2Realm VIP (${VIP_DAYS} дней) для «${server.name}»`
      : kind === 'soon_vip'
        ? `L2Realm VIP в «Скоро открытие» (${VIP_DAYS} дней) для «${server.name}»`
      : `L2Realm Буст (${BOOST_DAYS} дней) для «${server.name}»`;

    const idempotenceKey = uuidv4();
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount:       { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description,
        metadata:     { serverId, kind, ...(soonOpening?.instanceId && { instanceId: soonOpening.instanceId }) },
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

    const { serverId, kind, requestId, instanceId } = verified.metadata || {};
    if (kind !== 'vip' && kind !== 'boost' && kind !== 'soon' && kind !== 'soon_vip') {
      this.logger.warn(`⚠️ Платёж ${paymentId}: неизвестный kind в metadata`);
      return { ok: true };
    }
    if ((kind === 'vip' || kind === 'boost' || kind === 'soon_vip') && !serverId) {
      this.logger.warn(`⚠️ Платёж ${paymentId}: VIP/boost без serverId`);
      return { ok: true };
    }
    if (kind === 'soon' && !requestId) {
      this.logger.warn(`⚠️ Платёж ${paymentId}: soon без requestId`);
      return { ok: true };
    }

    // 3. Проверка суммы — защита от подмены amount
    const expected = kind === 'vip'
      ? VIP_PRICE
      : kind === 'boost'
        ? BOOST_PRICE
        : kind === 'soon_vip'
          ? SOON_VIP_PRICE
          : COMING_SOON_PRICE;
    const actualRub = parseFloat(verified.amount?.value);
    if (verified.amount?.currency !== 'RUB' || actualRub !== expected) {
      this.logger.error(
        `🚨 Платёж ${paymentId}: сумма не совпала (ожидали ${expected} RUB, пришло ${verified.amount?.value} ${verified.amount?.currency}) — НЕ активируем`,
      );
      return { ok: true };
    }

    // 4. Активация
    if (kind === 'vip' || kind === 'soon_vip') {
      if (kind === 'soon_vip') {
        await this.activateSoonVip(serverId, paymentId, instanceId);
      } else {
        await this.activateVip(serverId, paymentId);
      }
      this.logger.log(`✅ ${kind === 'soon_vip' ? 'Soon VIP' : 'VIP'} активирован для ${serverId} (payment ${paymentId}, ${actualRub} RUB)`);
    } else if (kind === 'boost') {
      await this.activateBoost(serverId, paymentId);
      this.logger.log(`✅ Буст активирован для ${serverId} (payment ${paymentId}, ${actualRub} RUB)`);
    } else {
      await this.activateSoon(requestId, paymentId);
      this.logger.log(`✅ «Скоро открытие» активировано (request ${requestId}, payment ${paymentId}, ${actualRub} RUB)`);
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
    const [sub, boost, soonReq] = await Promise.all([
      this.prisma.subscription.findFirst({ where: { paymentId } }),
      this.prisma.boost.findFirst({ where: { paymentId } }),
      this.prisma.serverRequest.findFirst({ where: { paymentId, paid: true } }),
    ]);
    if (sub || boost || soonReq) return true;

    const servers = await this.prisma.server.findMany({ select: { instances: true } });
    return servers.some(s => {
      const insts = Array.isArray(s.instances) ? s.instances as any[] : [];
      return insts.some(i => i?.soonVipPaymentId === paymentId);
    });
  }

  // ── Платное размещение «Скоро открытие» ──────
  async createSoonPurchase(
    userId: string,
    userEmail: string,
    ip: string,
    returnUrl: string,
    data: { name: string; chronicle: string; rates: string; url: string; openedDate: string; contact: string },
  ) {
    const clean = parseOrThrow(soonPurchaseSchema, data);
    returnUrl = parseOrThrow(returnUrlSchema, returnUrl);
    userEmail = parseOrThrow(z.string().trim().email(), userEmail);
    if (ip) parseOrThrow(safeIp, ip.replace(/^::ffff:/, ''));
    if (!userEmail) throw new BadRequestException('Email покупателя обязателен для чека');
    const opened = new Date(clean.openedDate);
    if (isNaN(opened.getTime()) || opened <= new Date()) {
      throw new BadRequestException('«Скоро открытие» — только для серверов с датой открытия в будущем');
    }

    // Антидубль по URL: уже зарегистрированный сервер или активная заявка
    const existing = await this.prisma.serverRequest.findFirst({
      where: { url: clean.url, status: { in: ['pending', 'approved', 'pending_payment'] } },
    });
    if (existing) throw new BadRequestException('Заявка для этого сервера уже существует');

    // Создаём заявку в статусе pending_payment — после успешного webhook'а станет approved
    const request = await this.prisma.serverRequest.create({
      data: {
        userId,
        ip,
        name:       clean.name,
        chronicle:  clean.chronicle,
        rates:      clean.rates,
        url:        clean.url,
        contact:    clean.contact,
        openedDate: opened,
        status:     'pending_payment',
        paid:       false,
      },
    });

    const shopId    = this.config.get('YOOKASSA_SHOP_ID');
    const secretKey = this.config.get('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Платежи временно недоступны. Обратитесь в поддержку.');
      }
      // dev: имитируем оплату, дальше — обычная модерация (status=pending, paid=true)
      await this.prisma.serverRequest.update({
        where: { id: request.id },
        data:  { status: 'pending', paid: true, paymentId: 'dev-' + uuidv4() },
      });
      return { dev: true, activated: true, requestId: request.id };
    }

    const description = `L2Realm «Скоро открытие» — анонс «${clean.name}»`;
    const idempotenceKey = uuidv4();
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount:       { value: COMING_SOON_PRICE.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description,
        metadata:     { kind: 'soon', requestId: request.id },
        capture:      true,
        receipt: {
          customer: { email: userEmail },
          items: [{
            description,
            quantity:        '1.00',
            amount:          { value: COMING_SOON_PRICE.toFixed(2), currency: 'RUB' },
            vat_code:        1,
            payment_mode:    'full_prepayment',
            payment_subject: 'service',
          }],
        },
      },
      { auth: { username: shopId, password: secretKey }, headers: { 'Idempotence-Key': idempotenceKey } },
    );

    // Сохраняем paymentId — пригодится в webhook
    await this.prisma.serverRequest.update({
      where: { id: request.id },
      data:  { paymentId: response.data.id },
    });

    return {
      paymentId:       response.data.id,
      confirmationUrl: response.data.confirmation.confirmation_url,
      status:          response.data.status,
      amount:          COMING_SOON_PRICE,
      kind:            'soon',
      requestId:       request.id,
    };
  }

  private async activateSoon(requestId: string, paymentId: string) {
    // После оплаты заявка идёт на модерацию: paid=true, но status=pending —
    // админ должен одобрить контент (название/описание/URL) перед публикацией.
    // Это защищает каталог от мусорных заявок даже от платных юзеров.
    await this.prisma.serverRequest.update({
      where: { id: requestId },
      data:  { status: 'pending', paid: true, paymentId },
    });
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

  async activateSoonVip(serverId: string, paymentId: string | null, instanceId?: string | null) {
    if (!instanceId) return this.activateVip(serverId, paymentId);

    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');

    const insts = Array.isArray(server.instances) ? server.instances as any[] : [];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + VIP_DAYS);

    let found = false;
    const next = insts.map(inst => {
      if (inst?.id !== instanceId) return inst;
      found = true;
      return {
        ...inst,
        soonVipUntil: endDate.toISOString(),
        soonVipPaymentId: paymentId,
      };
    });

    if (!found) throw new NotFoundException('Запуск проекта не найден');
    await this.prisma.server.update({ where: { id: serverId }, data: { instances: next } });
    return { ok: true, serverId, instanceId, kind: 'soon_vip', endDate };
  }

  async grantSoonVip(serverId: string, instanceId?: string | null) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId }, include: { subscription: true } });
    if (!server) throw new NotFoundException('Сервер не найден');

    const soonOpening = findSoonOpening(server, instanceId);
    if (!soonOpening) throw new BadRequestException('Выберите будущий запуск из «Скоро открытие»');
    if (isSoonOpeningVipActive(server, soonOpening.instanceId)) {
      throw new BadRequestException('У этого запуска уже активен VIP в «Скоро открытие»');
    }

    const status = await this.getSoonVipStatus();
    if (status.taken >= SOON_VIP_MAX) {
      throw new BadRequestException(`Все ${SOON_VIP_MAX} VIP-места в «Скоро открытие» заняты`);
    }

    return this.activateSoonVip(serverId, null, soonOpening.instanceId);
  }

  async removeSoonVip(serverId: string, instanceId?: string | null) {
    if (!instanceId) return this.removeVip(serverId);

    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Сервер не найден');

    const insts = Array.isArray(server.instances) ? server.instances as any[] : [];
    let found = false;
    const next = insts.map(inst => {
      if (inst?.id !== instanceId) return inst;
      found = true;
      const rest = { ...inst };
      delete rest.soonVipUntil;
      delete rest.soonVipPaymentId;
      return rest;
    });
    if (!found) throw new NotFoundException('Запуск проекта не найден');

    await this.prisma.server.update({ where: { id: serverId }, data: { instances: next } });
    return { ok: true, serverId, instanceId, kind: 'soon_vip_removed' };
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
      include: { server: true },
    });
    const mainActive = active.filter(s => !isOnlyComingSoonServer(s.server));
    const taken = mainActive.length;
    const free  = Math.max(0, VIP_MAX - taken);
    const nextFreeAt = taken >= VIP_MAX ? mainActive[0]?.endDate ?? null : null;
    return { taken, free, max: VIP_MAX, nextFreeAt, slots: mainActive.map(compactVipSlot) };
  }

  async getSoonVipStatus() {
    const now = new Date();
    const active = await this.prisma.subscription.findMany({
      where: { plan: 'VIP', endDate: { gt: now } },
      orderBy: { endDate: 'asc' },
      include: { server: true },
    });
    const soonActive = active.filter(s => isOnlyComingSoonServer(s.server));
    const instanceSlots = await this.getActiveSoonVipInstanceSlots(now);
    const slots = [...soonActive.map(compactVipSlot), ...instanceSlots]
      .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    const taken = slots.length;
    const free  = Math.max(0, SOON_VIP_MAX - taken);
    const nextFreeAt = taken >= SOON_VIP_MAX ? slots[0]?.endDate ?? null : null;
    return { taken, free, max: SOON_VIP_MAX, nextFreeAt, slots };
  }

  private async getActiveSoonVipInstanceSlots(now: Date) {
    const servers = await this.prisma.server.findMany({
      select: { id: true, name: true, icon: true, instances: true },
    });

    const slots: any[] = [];
    for (const server of servers) {
      const insts = Array.isArray(server.instances) ? server.instances as any[] : [];
      for (const inst of insts) {
        if (!inst?.soonVipUntil || new Date(inst.soonVipUntil) <= now) continue;
        slots.push({
          id: `${server.id}:${inst.id}`,
          serverId: server.id,
          instanceId: inst.id,
          instanceLabel: inst.label || inst.rates || inst.chronicle,
          endDate: inst.soonVipUntil,
          server: { id: server.id, name: server.name, icon: server.icon },
        });
      }
    }
    return slots;
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

function isComingSoonServer(server: any): boolean {
  return !!nextOpeningDate(server);
}

function hasOpenedLaunch(server: any): boolean {
  const now = Date.now();
  if (server?.openedDate) {
    const t = new Date(server.openedDate).getTime();
    if (!isNaN(t) && t <= now) return true;
  }

  const insts = Array.isArray(server?.instances) ? server.instances : [];
  let hasDatedInstance = false;
  for (const inst of insts) {
    if (!inst?.openedDate) continue;
    const t = new Date(inst.openedDate).getTime();
    if (isNaN(t)) continue;
    hasDatedInstance = true;
    if (t <= now) return true;
  }

  if (insts.length === 0 && !server?.openedDate) return true;
  if (insts.length > 0 && !server?.openedDate && !hasDatedInstance) return true;
  return false;
}

function isOnlyComingSoonServer(server: any): boolean {
  return isComingSoonServer(server) && !hasOpenedLaunch(server);
}

function findSoonOpening(server: any, instanceId?: string | null): { instanceId: string | null; openedAt: Date } | null {
  const now = Date.now();
  if (instanceId) {
    const insts = Array.isArray(server?.instances) ? server.instances : [];
    const inst = insts.find((i: any) => i?.id === instanceId);
    if (!inst?.openedDate) return null;
    const openedAt = new Date(inst.openedDate);
    if (isNaN(openedAt.getTime()) || openedAt.getTime() <= now) return null;
    return { instanceId, openedAt };
  }

  if (server?.openedDate) {
    const openedAt = new Date(server.openedDate);
    if (!isNaN(openedAt.getTime()) && openedAt.getTime() > now) {
      return { instanceId: null, openedAt };
    }
  }
  return null;
}

function isSoonOpeningVipActive(server: any, instanceId?: string | null): boolean {
  const now = new Date();
  if (!instanceId) {
    const sub = server?.subscription;
    return !!(sub?.plan === 'VIP' && sub?.endDate && new Date(sub.endDate) > now);
  }
  const insts = Array.isArray(server?.instances) ? server.instances : [];
  const inst = insts.find((i: any) => i?.id === instanceId);
  return !!inst?.soonVipUntil && new Date(inst.soonVipUntil) > now;
}

function nextOpeningDate(server: any): Date | null {
  const now = Date.now();
  const dates: Date[] = [];
  if (server?.openedDate) {
    const d = new Date(server.openedDate);
    if (!isNaN(d.getTime()) && d.getTime() > now) dates.push(d);
  }
  const insts = Array.isArray(server?.instances) ? server.instances : [];
  for (const i of insts) {
    if (!i?.openedDate) continue;
    const d = new Date(i.openedDate);
    if (!isNaN(d.getTime()) && d.getTime() > now) dates.push(d);
  }
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}

function compactVipSlot(s: any) {
  return {
    id: s.id,
    serverId: s.serverId,
    endDate: s.endDate,
    server: {
      id: s.server.id,
      name: s.server.name,
      icon: s.server.icon,
    },
  };
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
