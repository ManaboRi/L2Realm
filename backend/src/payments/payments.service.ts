import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Онлайн-оплата отключена. VIP/буст выдаются вручную через админку.
export const VIP_DAYS     = 31;
export const VIP_MAX      = 8;
export const BOOST_DAYS   = 7;
export const SOON_VIP_MAX = 8;
const OPENING_DAY_MS      = 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ── Активация VIP (admin) ─────────────────────
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
      throw new BadRequestException('Этот запуск уже в «Рекомендуем»');
    }

    // Лимит мест убран — добавляем сколько нужно вручную из админки.
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

  // ── Статус VIP мест ───────────────────────────
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

  // ── Активные бусты (для сортировки) ───────────
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

function isOpeningStillSoon(value?: Date | string | null, nowTs = Date.now()): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  return !isNaN(t) && t + OPENING_DAY_MS > nowTs;
}

function hasOpenedLaunch(server: any): boolean {
  const now = Date.now();
  if (server?.openedDate) {
    const t = new Date(server.openedDate).getTime();
    if (!isNaN(t) && t + OPENING_DAY_MS <= now) return true;
  }

  const insts = Array.isArray(server?.instances) ? server.instances : [];
  let hasDatedInstance = false;
  for (const inst of insts) {
    if (!inst?.openedDate) continue;
    const t = new Date(inst.openedDate).getTime();
    if (isNaN(t)) continue;
    hasDatedInstance = true;
    if (t + OPENING_DAY_MS <= now) return true;
  }

  if (insts.length === 0 && !server?.openedDate) return true;
  if (insts.length > 0 && !server?.openedDate && !hasDatedInstance) return true;
  return false;
}

function nextOpeningDate(server: any): Date | null {
  const candidates: number[] = [];
  const now = Date.now();
  if (server?.openedDate) {
    const t = new Date(server.openedDate).getTime();
    if (!isNaN(t) && t + OPENING_DAY_MS > now) candidates.push(t);
  }
  const insts = Array.isArray(server?.instances) ? server.instances : [];
  for (const inst of insts) {
    if (!inst?.openedDate) continue;
    const t = new Date(inst.openedDate).getTime();
    if (!isNaN(t) && t + OPENING_DAY_MS > now) candidates.push(t);
  }
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates));
}

function isOnlyComingSoonServer(server: any): boolean {
  return isComingSoonServer(server) && !hasOpenedLaunch(server);
}

function findSoonOpening(server: any, instanceId?: string | null): { instanceId: string | null } | null {
  const insts = Array.isArray(server?.instances) ? server.instances : [];
  const futureInstances = insts.filter((inst: any) => isOpeningStillSoon(inst?.openedDate));

  if (instanceId) {
    const match = futureInstances.find((inst: any) => inst?.id === instanceId);
    if (match) return { instanceId: match.id };
    return null;
  }

  if (isOpeningStillSoon(server?.openedDate)) return { instanceId: null };
  if (futureInstances.length === 1) return { instanceId: futureInstances[0].id };
  return null;
}

function isSoonOpeningVipActive(server: any, instanceId: string | null): boolean {
  if (instanceId) {
    const insts = Array.isArray(server?.instances) ? server.instances : [];
    const inst = insts.find((i: any) => i?.id === instanceId);
    return !!inst?.soonVipUntil && new Date(inst.soonVipUntil) > new Date();
  }
  const sub = server?.subscription;
  return sub?.plan === 'VIP' && sub.endDate && new Date(sub.endDate) > new Date();
}

function compactVipSlot(s: any): any {
  const server = s.server || {};
  return {
    id: s.id,
    serverId: server.id,
    instanceId: null,
    instanceLabel: null,
    endDate: s.endDate,
  };
}
