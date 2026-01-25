import { Body, Controller, Post, Req, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiProperty, ApiOkResponse, ApiTags } from '@nestjs/swagger';

class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'strongpassword', minLength: 6 })
  password!: string;
}

class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'strongpassword' })
  password!: string;
}

class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  refresh_token!: string;
}

class LogoutDto {
  @ApiProperty({ example: 'eyJhbGciOi...', required: false })
  refresh_token?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ schema: { example: { success: true, data: { accessToken: 'jwt...', refreshToken: 'refresh...', user: { id: 'user-uuid', email: 'user@example.com' } } } } })
  async register(@Body() body: RegisterDto) {
    if (!body.email || !body.password || body.password.length < 6) {
      throw new UnauthorizedException('invalid_email_or_password');
    }
    const res = await this.auth.register(body.email.trim().toLowerCase(), body.password);
    return { success: true, data: { accessToken: res.tokens.accessToken, refreshToken: res.tokens.refreshToken, expiresIn: res.tokens.expiresIn, user: res.user } };
  }

  @Post('login')
  @ApiOkResponse({ schema: { example: { success: true, data: { accessToken: 'jwt...', refreshToken: 'refresh...', user: { id: 'user-uuid' } } } } })
  async login(@Req() req: any, @Body() body: LoginDto) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const ua = req.headers['user-agent'] || null;
    const res = await this.auth.login(body.email.trim().toLowerCase(), body.password, ip, ua);
    return { success: true, data: { accessToken: res.tokens.accessToken, refreshToken: res.tokens.refreshToken, expiresIn: res.tokens.expiresIn, user: res.user } };
  }

  @Post('refresh')
  @ApiOkResponse({ schema: { example: { success: true, data: { accessToken: 'jwt...', refreshToken: 'refresh...' } } } })
  async refresh(@Req() req: any, @Body() body: RefreshDto) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const ua = req.headers['user-agent'] || null;
    const r = await this.auth.refreshSession(body.refresh_token, ip, ua);
    return { success: true, data: { accessToken: r.tokens.accessToken, refreshToken: r.tokens.refreshToken, expiresIn: r.tokens.expiresIn, user: r.user } };
  }

  @Post('logout')
  @ApiOkResponse({ schema: { example: { success: true } } })
  async logout(@Body() body: LogoutDto = {} as LogoutDto) {
    await this.auth.logout(body.refresh_token);
    return { success: true };
  }
}
