import { Controller, Post, Get, Body, UseGuards, Request, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, SendCodeDto, VerifyCodeDto, VkCallbackDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.auth.register(dto, ip);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto, @Ip() ip: string) {
    return this.auth.sendEmailCode(dto.email, ip);
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyEmailCode(dto.email, dto.code);
  }

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

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

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
}
