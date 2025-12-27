import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth) throw new UnauthorizedException();
    const parts = auth.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    const payload = this.auth.verifyToken(token);
    if (!payload) throw new UnauthorizedException();
    // attach to request
    req.user = payload;
    return true;
  }
}
