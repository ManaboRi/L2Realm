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
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
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
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Текущий пользователь ─────────────────────
  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
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
  private signToken(sub: string, email: string, role: string) {
    return {
      access_token: this.jwt.sign({ sub, email, role }),
      user: { id: sub, email, role },
    };
  }
}
