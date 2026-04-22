import { Controller, Post, Get, Body, UseGuards, Request, Ip, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, SendCodeDto, VerifyCodeDto, VkCallbackDto, UpdateNicknameDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Регистрация: 5 попыток в час с одного IP
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.auth.register(dto, ip);
  }

  // Вход по паролю: 10 попыток в 15 минут (защита от брутфорса)
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Отправка email-кода: 5 в час (защита от email-bomb)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto, @Ip() ip: string) {
    return this.auth.sendEmailCode(dto.email, ip);
  }

  // Проверка кода: 10 попыток в 15 минут
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyEmailCode(dto.email, dto.code);
  }

  // VK callback: 20 в час (один пользователь обычно логинится 1-2 раза)
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  @Post('vk/callback')
  vkCallback(@Body() dto: VkCallbackDto, @Ip() ip: string) {
    return this.auth.loginWithVk({ ...dto, ip });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getMe(req.user.id);
  }

  // Запрос сброса: 3 в час (защита от email-bomb)
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  // Сброс пароля: 5 попыток в час
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Request() req: { user: { id: string } }) {
    return this.auth.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch('nickname')
  updateNickname(@Body() dto: UpdateNicknameDto, @Request() req: { user: { id: string } }) {
    return this.auth.updateNickname(req.user.id, dto.nickname);
  }
}
