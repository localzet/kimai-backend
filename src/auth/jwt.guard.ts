import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) throw new UnauthorizedException('missing_authorization_header');
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (!token) throw new UnauthorizedException('missing_token');

    const result = await this.auth.verifyAccessTokenAndGetUser(token);
    if (!result) throw new UnauthorizedException('invalid_or_expired_token');

    // attach user and token payload to request
    req.user = result.user;
    req.auth = result.payload;
    return true;
  }
}
