import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { VkService } from './vk.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { parseOrThrow, safeText } from '../common/input-validation';
import { z } from 'zod';

const VK_ALLOWED_REDIRECT_URI = 'https://l2realm.ru/auth/callback';

const vkCallbackSchema = z.object({
  code: safeText(8, 2048),
  deviceId: safeText(1, 256),
  codeVerifier: safeText(32, 256),
  redirectUri: z.literal(VK_ALLOWED_REDIRECT_URI),
  state: safeText(8, 256),
  ip: z.string().optional(),
});

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private vk: VkService,
  ) {}

  // ── Регистрация ──────────────────────────────
  async register(dto: RegisterDto, ip?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email уже зарегистрирован');

    // Защита от накрутки: макс 2 аккаунта с одного IP
    if (ip) {
      const ipCount = await this.prisma.user.count({ where: { registrationIp: ip } });
      if (ipCount >= 2) {
        throw new ForbiddenException('С этого IP уже зарегистрировано максимальное количество аккаунтов');
      }
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash, name: dto.name, registrationIp: ip },
    });

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Вход ─────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Отправка кода входа на email ─────────────
  async sendEmailCode(email: string, ip?: string) {
    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Защита от накрутки при автосоздании юзера через код
      if (ip) {
        const ipCount = await this.prisma.user.count({ where: { registrationIp: ip } });
        if (ipCount >= 2) {
          throw new ForbiddenException('С этого IP уже зарегистрировано максимальное количество аккаунтов');
        }
      }
      user = await this.prisma.user.create({
        data: { email, registrationIp: ip, emailCode: code, emailCodeExpires: expires },
      });
    } else {
      await this.prisma.user.update({
        where: { email },
        data:  { emailCode: code, emailCodeExpires: expires },
      });
    }

    await this.email.sendLoginCode(email, code);
    return { ok: true };
  }

  // ── Проверка кода и вход ─────────────────────
  async verifyEmailCode(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailCode || !user.emailCodeExpires) {
      throw new BadRequestException('Код не запрашивался');
    }
    if (user.emailCodeExpires < new Date()) {
      throw new BadRequestException('Срок действия кода истёк');
    }
    if (user.emailCode !== code) {
      throw new BadRequestException('Неверный код');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { emailCode: null, emailCodeExpires: null, emailVerified: true },
    });

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Вход через VK ID ─────────────────────────
  async loginWithVk(params: {
    code: string;
    deviceId: string;
    codeVerifier: string;
    redirectUri: string;
    state: string;
    ip?: string;
  }) {
    const clean = parseOrThrow(vkCallbackSchema, params) as typeof params;
    const { accessToken } = await this.vk.exchangeCode({
      code:         clean.code,
      deviceId:     clean.deviceId,
      codeVerifier: clean.codeVerifier,
      redirectUri:  clean.redirectUri,
      state:        clean.state,
    });
    const info = await this.vk.fetchUserInfo(accessToken);

    // 1. ищем по vkId — на каждом логине освежаем аватар и имя из VK
    let user = await this.prisma.user.findUnique({ where: { vkId: info.vkId } });
    if (user) {
      const name = [info.firstName, info.lastName].filter(Boolean).join(' ') || user.name;
      if (info.avatar !== user.avatar || name !== user.name) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data:  { avatar: info.avatar ?? user.avatar, name },
        });
      }
    }

    // 2. если нет — пробуем привязать по email
    if (!user && info.email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: info.email } });
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data:  { vkId: info.vkId, emailVerified: true, avatar: info.avatar ?? byEmail.avatar },
        });
      }
    }

    // 3. создаём нового
    if (!user) {
      const email = info.email || `vk${info.vkId}@vk.l2realm.ru`;
      const name  = [info.firstName, info.lastName].filter(Boolean).join(' ') || null;
      const nickname = await this.generateUniqueNickname();
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          nickname,
          vkId:          info.vkId,
          avatar:        info.avatar,
          emailVerified: !!info.email,
          registrationIp: clean.ip,
        },
      });
    }

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Смена никнейма (не чаще раза в 7 дней) ──
  async updateNickname(userId: string, nickname: string) {
    const trimmed = nickname.trim();
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9_\-]{3,16}$/.test(trimmed)) {
      throw new BadRequestException('Никнейм: 3-16 символов, только буквы/цифры/_-');
    }

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nicknameChangedAt: true },
    });
    if (me?.nicknameChangedAt) {
      const nextAllowed = new Date(me.nicknameChangedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (nextAllowed > new Date()) {
        const d = nextAllowed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        throw new BadRequestException(`Никнейм можно менять раз в 7 дней. Следующая смена — ${d}`);
      }
    }

    const exists = await this.prisma.user.findFirst({
      where: { nickname: { equals: trimmed, mode: 'insensitive' }, NOT: { id: userId } },
    });
    if (exists) throw new ConflictException('Этот никнейм уже занят');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  { nickname: trimmed, nicknameChangedAt: new Date() },
      select: { id: true, email: true, name: true, nickname: true, avatar: true, role: true, nicknameChangedAt: true },
    });
    return user;
  }

  // Генерим уникальный "User_12345"
  private async generateUniqueNickname(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const candidate = `User_${Math.floor(10000 + Math.random() * 90000)}`;
      const exists = await this.prisma.user.findUnique({ where: { nickname: candidate } });
      if (!exists) return candidate;
    }
    return `User_${Date.now().toString(36)}`;
  }

  // ── Текущий пользователь ─────────────────────
  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, nickname: true, avatar: true, role: true, vkId: true, createdAt: true, nicknameChangedAt: true },
    });
  }

  // ── Запрос сброса пароля ─────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Не раскрываем — существует ли email
    if (!user) return { ok: true };

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    await this.prisma.user.update({
      where: { email },
      data:  { resetToken: token, resetTokenExpires: expires },
    });

    await this.email.sendPasswordReset(email, token);
    return { ok: true };
  }

  // ── Смена пароля для залогиненного ───────────
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new BadRequestException('Неверный текущий пароль');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { password: hash },
    });
    return { ok: true };
  }

  // ── Сброс пароля по токену ───────────────────
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken:        token,
        resetTokenExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Токен недействителен или истёк');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { password: hash, resetToken: null, resetTokenExpires: null },
    });

    return { ok: true };
  }

  // ── Подписать JWT ────────────────────────────
  private async signToken(sub: string, email: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true, nickname: true, avatar: true, role: true },
    });
    return {
      access_token: this.jwt.sign({ sub, email, role }),
      user,
    };
  }
}
