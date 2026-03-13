import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService, AuthResponse, LoginDto, RegisterDto } from './auth.service';

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
}
