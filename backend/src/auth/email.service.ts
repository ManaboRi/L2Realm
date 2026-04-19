import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get('SMTP_PORT') || 587),
        secure: config.get('SMTP_SECURE') === 'true',
        auth: {
          user: config.get('SMTP_USER'),
          pass: config.get('SMTP_PASS'),
        },
      });
    }
  }

  async sendPasswordReset(email: string, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#1a1a1a;color:#e8e8e8;padding:2rem;border-radius:8px;border:1px solid #333;">
        <h2 style="color:#C9A227;margin-top:0;">Восстановление пароля L2Realm</h2>
        <p>Запрос на сброс пароля был получен для этого email. Ссылка действует <strong>1 час</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#C9A227;color:#000;padding:.7rem 1.6rem;text-decoration:none;border-radius:4px;font-weight:700;margin:1rem 0;">
          Сбросить пароль
        </a>
        <p style="color:#888;font-size:.85rem;">Или скопируй ссылку:<br/>${resetUrl}</p>
        <hr style="border-color:#333;margin:1.5rem 0 1rem;"/>
        <p style="color:#666;font-size:.8rem;">Если ты не запрашивал(а) сброс — просто проигнорируй это письмо. Пароль останется прежним.</p>
      </div>
    `;

    if (!this.transporter) {
      // Dev mode: log to console instead of sending
      this.logger.warn(`[DEV EMAIL] Письмо на ${email} не отправлено (SMTP не настроен).`);
      this.logger.warn(`[DEV EMAIL] Ссылка сброса: ${resetUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from:    this.config.get('SMTP_FROM') || 'L2Realm <noreply@l2realm.ru>',
      to:      email,
      subject: 'Восстановление пароля L2Realm',
      html,
    });
    this.logger.log(`Письмо восстановления отправлено на ${email}`);
  }

  async sendLoginCode(email: string, code: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#1a1a1a;color:#e8e8e8;padding:2rem;border-radius:8px;border:1px solid #333;">
        <h2 style="color:#C9A227;margin-top:0;">Код входа L2Realm</h2>
        <p>Твой код для входа на сайт:</p>
        <div style="font-size:2rem;letter-spacing:.5rem;font-weight:700;background:#0c0c0c;border:1px solid #C9A227;color:#C9A227;padding:1rem;text-align:center;border-radius:6px;margin:1.5rem 0;">
          ${code}
        </div>
        <p style="color:#888;font-size:.85rem;">Код действует <strong>10 минут</strong>.</p>
        <hr style="border-color:#333;margin:1.5rem 0 1rem;"/>
        <p style="color:#666;font-size:.8rem;">Если ты не запрашивал код — просто проигнорируй это письмо.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`[DEV EMAIL] Код входа для ${email}: ${code}`);
      return;
    }

    await this.transporter.sendMail({
      from:    this.config.get('SMTP_FROM') || 'L2Realm <noreply@l2realm.ru>',
      to:      email,
      subject: `Код входа L2Realm: ${code}`,
      html,
    });
    this.logger.log(`Код входа отправлен на ${email}`);
  }
}
