import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Вход администратора по email+паролю. Публичной регистрации на сайте нет.
  // 10 попыток в 15 минут (защита от брутфорса).
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Вход по секретному ключу из файла-ярлыка на ПК админа.
  // 10 попыток в 15 минут.
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post('key-login')
  keyLogin(@Body() body: { key?: string }) {
    return this.auth.loginWithKey(body?.key ?? '');
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getMe(req.user.id);
  }
}
