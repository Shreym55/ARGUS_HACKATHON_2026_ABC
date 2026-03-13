import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService, AuthResponse, LoginDto, RegisterDto, VerifyEmailDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.getCurrentUser(authorization);
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.logout(authorization);
  }

  /** Verify email with the 6-digit OTP sent after registration */
  @Post('verify-email')
  async verifyEmail(
    @Headers('authorization') authorization: string,
    @Body() body: VerifyEmailDto,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    const payload = await this.authService.verifyToken(token);
    return this.authService.verifyEmail(payload.sub, body);
  }

  /** Re-send OTP. In dev the token is returned directly; in prod it goes via email. */
  @Post('resend-verification')
  async resendVerification(@Headers('authorization') authorization: string) {
    const token = this.authService.extractBearerToken(authorization);
    const payload = await this.authService.verifyToken(token);
    return this.authService.resendVerification(payload.sub);
  }
}
