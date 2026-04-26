import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const SITE = 'https://l2realm.ru';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtType(types: string[] | null | undefined): string {
  if (!types || !types.length) return '—';
  if (types.includes('pvp')) return 'PvP';
  if (types.includes('pve')) return 'PvE';
  return types[0];
}

function fmtMskDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long',
    timeZone: 'Europe/Moscow',
  });
}

function fmtMskDateTime(d: Date): string {
  return d.toLocaleString('ru-RU', {
    day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // ── Низкоуровневая отправка ──────────────────
  async sendMessage(text: string): Promise<boolean> {
    const token  = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHANNEL_ID');
    if (!token || !chatId) {
      this.logger.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID не заданы — пост пропущен');
      return false;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram API ошибка ${res.status}: ${body}`);
        return false;
      }
      return true;
    } catch (e: any) {
      this.logger.error(`Telegram fetch failed: ${e.message}`);
      return false;
    }
  }

  // ── Сервер дня — каждый день в 12:00 МСК = 09:00 UTC ─
  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async cronServerOfDay() { await this.postServerOfDay(); }

  async postServerOfDay() {
    const now = new Date();

    // Кандидаты: открытые серверы (или без даты), у которых нет активного VIP
    const candidates = await this.prisma.server.findMany({
      where: {
        OR: [{ openedDate: null }, { openedDate: { lte: now } }],
      },
      include: { subscription: true },
    });

    // Активные бусты — отсеиваем
    const boostedIds = new Set(
      (await this.prisma.boost.findMany({
        where: { endDate: { gt: now } },
        select: { serverId: true },
      })).map(b => b.serverId),
    );

    const eligible = candidates.filter(s => {
      const subActive = s.subscription?.endDate && s.subscription.endDate > now;
      const isVip = s.subscription?.plan === 'VIP' && subActive;
      return !isVip && !boostedIds.has(s.id);
    });

    if (eligible.length === 0) {
      this.logger.warn('Нет подходящих серверов для «Сервера дня»');
      return;
    }

    const chosen = eligible[Math.floor(Math.random() * eligible.length)];

    await this.prisma.$transaction([
      this.prisma.server.updateMany({
        where: { serverOfDay: true },
        data:  { serverOfDay: false },
      }),
      this.prisma.server.update({
        where: { id: chosen.id },
        data:  { serverOfDay: true },
      }),
    ]);

    const text =
      `★ <b>Сервер дня</b> — ${fmtMskDate(now)}\n\n` +
      `<b>${escapeHtml(chosen.name)}</b>\n` +
      `📜 ${escapeHtml(chosen.chronicle)} · ⚡ ${escapeHtml(chosen.rates)} · 🏆 ${fmtType(chosen.type)}\n` +
      `👥 Онлайн: ${chosen.online ?? 0} игроков\n\n` +
      `${SITE}/servers/${chosen.id}`;

    const sent = await this.sendMessage(text);
    if (sent) this.logger.log(`✅ Сервер дня отправлен: ${chosen.name}`);
  }

  // ── Завтра открытие — каждый час ─────────────
  @Cron('0 * * * *', { timeZone: 'UTC' })
  async cronOpeningSoon() { await this.postOpeningSoon(); }

  async postOpeningSoon() {
    const now    = new Date();
    const window = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const opening = await this.prisma.server.findMany({
      where: {
        notifiedOpening: false,
        openedDate: { gt: now, lte: window },
      },
      orderBy: { openedDate: 'asc' },
    });

    for (const s of opening) {
      const text =
        `⏳ <b>Завтра открытие</b>\n\n` +
        `<b>${escapeHtml(s.name)}</b>\n` +
        `📜 ${escapeHtml(s.chronicle)} · ⚡ ${escapeHtml(s.rates)}\n` +
        `🕐 Открытие: ${fmtMskDateTime(s.openedDate!)} МСК\n\n` +
        `${SITE}/servers/${s.id}`;

      const sent = await this.sendMessage(text);
      if (sent) {
        await this.prisma.server.update({
          where: { id: s.id },
          data:  { notifiedOpening: true },
        });
        this.logger.log(`✅ Уведомление об открытии отправлено: ${s.name}`);
      }
    }
  }

  // ── Новый сервер в каталоге (вызывается из servers.service.create) ─
  async postNewServer(serverId: string) {
    const s = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!s) return;

    const opening = s.openedDate
      ? (s.openedDate > new Date()
          ? s.openedDate.toLocaleDateString('ru-RU', {
              day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Europe/Moscow',
            })
          : 'уже открыт')
      : 'уже открыт';

    const text =
      `⚔️ <b>Новый сервер в каталоге</b>\n\n` +
      `<b>${escapeHtml(s.name)}</b>\n` +
      `📜 ${escapeHtml(s.chronicle)} · ⚡ ${escapeHtml(s.rates)} · 🏆 ${fmtType(s.type)}\n` +
      `📅 Открытие: ${opening}\n\n` +
      `${SITE}/servers/${s.id}`;

    const sent = await this.sendMessage(text);
    if (sent) this.logger.log(`✅ Анонс нового сервера: ${s.name}`);
  }
}
