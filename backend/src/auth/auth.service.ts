import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Вход администратора по email+паролю ──────
  // Публичной регистрации нет: учётная запись администратора создаётся сидом.
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Вход по секретному ключу (файл-ярлык на ПК админа) ──
  // Ключ лежит в env ADMIN_KEY (>= 32 символа). Сверяем в постоянном времени,
  // чтобы исключить timing-атаку, и выдаём токен админа. Видимой формы нет.
  async loginWithKey(rawKey: string) {
    const expected = this.config.get<string>('ADMIN_KEY');
    if (!expected || expected.length < 32) {
      throw new UnauthorizedException('Вход по ключу не настроен');
    }
    const a = Buffer.from(String(rawKey ?? ''));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Неверный ключ');
    }

    // Берём администратора: по ADMIN_EMAIL, иначе первого с ролью ADMIN.
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const user = adminEmail
      ? await this.prisma.user.findUnique({ where: { email: adminEmail } })
      : await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user || user.role !== 'ADMIN') throw new UnauthorizedException('Администратор не найден');

    return this.signToken(user.id, user.email, user.role);
  }

  // ── Текущий пользователь (для проверки токена админки) ──
  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  // ── Подписать JWT ────────────────────────────
  private async signToken(sub: string, email: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true, role: true },
    });
    return {
      access_token: this.jwt.sign({ sub, email, role }),
      user,
    };
  }
}
