import { Controller, Post, Headers, UnauthorizedException, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { TelegramService } from './telegram.service';

// HTTP-эндпоинты для ручного триггера (тестирование, восстановление после падения cron).
// Защищены `Authorization: Bearer ${CRON_SECRET}`. Внутренние @Cron-триггеры в TelegramService
// работают независимо от этих эндпоинтов.
@Controller('cron')
export class TelegramController {
  constructor(
    private telegram: TelegramService,
    private config: ConfigService,
  ) {}

  private guard(auth: string | undefined): void {
    const secret = this.config.get<string>('CRON_SECRET');
    if (!secret) throw new UnauthorizedException('CRON_SECRET не задан в env');
    if (auth !== `Bearer ${secret}`) throw new UnauthorizedException('Недопустимый CRON_SECRET');
  }

  @SkipThrottle()
  @Post('server-day')
  @HttpCode(200)
  async serverDay(@Headers('authorization') auth?: string) {
    this.guard(auth);
    await this.telegram.postServerOfDay();
    return { ok: true };
  }

  @SkipThrottle()
  @Post('opening-soon')
  @HttpCode(200)
  async openingSoon(@Headers('authorization') auth?: string) {
    this.guard(auth);
    await this.telegram.postOpeningSoon();
    return { ok: true };
  }
}
