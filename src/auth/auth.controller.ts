import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

class RegisterDto {
  email!: string;
  password!: string;
}

class LoginDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    if (!body.email || !body.password || body.password.length < 6) {
      throw new UnauthorizedException('invalid_email_or_password');
    }
    const res = await this.auth.register(body.email.trim().toLowerCase(), body.password);
    return { token: res.token, user_id: res.userId, refresh_token: res.refreshToken };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.auth.validateUser(body.email.trim().toLowerCase(), body.password);
    if (!user) throw new UnauthorizedException();
    const token = this.auth.createToken(user.id, user.mixId, user.tokenVersion);
    // create session and return refresh_token
    const session = await this.auth.login(body.email.trim().toLowerCase(), body.password);
    return { token: session.token, user_id: session.userId, refresh_token: session.refreshToken };
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    const r = await this.auth.refreshSession(body.refresh_token);
    return { token: r.token, user_id: r.userId };
  }

  @Post('logout')
  async logout(@Body() body: { refresh_token?: string } = {}) {
    await this.auth.logout(body.refresh_token);
    return { ok: true };
  }
}
