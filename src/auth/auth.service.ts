import { Injectable, ConflictException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const ACCESS_TOKEN_EXPIRES_SEC = parseInt(process.env.ACCESS_TOKEN_EXPIRES_SEC || '') || 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) { }

  private generateRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  private async createSession(userId: string, ip?: string | null, ua?: string | null) {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);

    try {
      await this.prisma.session.create({
        data: {
          userId,
          refreshToken,
          expiresAt,
          lastUsedAt: new Date(),
          ipAddress: ip,
          userAgent: ua,
        },
      });
    } catch (e) {
      throw new InternalServerErrorException('session_create_failed');
    }

    return { refreshToken, expiresAt };
  }

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('user_exists');

    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash as any,
      },
    });

    // best-effort: initialize sync state
    await this.prisma.syncState.create({
      data: {
        userId: user.id,
        status: 'idle',
      },
    }).catch(() => { });

    const accessToken = this.createAccessToken(user.id, user.tokenVersion);
    const session = await this.createSession(user.id);

    return {
      tokens: { accessToken, refreshToken: session.refreshToken, expiresIn: ACCESS_TOKEN_EXPIRES_SEC },
      user: { id: user.id, email: user.email },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const stored = (user as any).password;
    if (!stored) return null;
    const ok = await bcrypt.compare(password, stored);
    if (!ok) return null;
    return user;
  }

  async login(email: string, password: string, ip?: string | null, ua?: string | null) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('invalid_credentials');
    const accessToken = this.createAccessToken(user.id, user.tokenVersion);
    const session = await this.createSession(user.id, ip, ua);
    return {
      tokens: { accessToken, refreshToken: session.refreshToken, expiresIn: ACCESS_TOKEN_EXPIRES_SEC },
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Refreshes a session using a refresh token.
   * Implements refresh token rotation: returns new refresh token and updates DB.
   */
  async refreshSession(presentedRefreshToken: string, ip?: string | null, ua?: string | null) {
    const s = await this.prisma.session.findUnique({ where: { refreshToken: presentedRefreshToken } });
    if (!s) throw new UnauthorizedException('invalid_refresh');
    if (s.expiresAt < new Date()) {
      // remove expired session
      await this.prisma.session.deleteMany({ where: { refreshToken: presentedRefreshToken } }).catch(() => { });
      throw new UnauthorizedException('refresh_expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: s.userId } });
    if (!user) {
      await this.prisma.session.deleteMany({ where: { refreshToken: presentedRefreshToken } }).catch(() => { });
      throw new NotFoundException('user_not_found');
    }

    // rotate refresh token: generate new token and update session
    const newRefresh = this.generateRefreshToken();
    await this.prisma.session.update({ where: { refreshToken: presentedRefreshToken }, data: { refreshToken: newRefresh, lastUsedAt: new Date(), ipAddress: ip, userAgent: ua } });

    const accessToken = this.createAccessToken(user.id, user.tokenVersion);
    return {
      tokens: { accessToken, refreshToken: newRefresh, expiresIn: ACCESS_TOKEN_EXPIRES_SEC },
      user: { id: user.id, email: user.email },
    };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({ where: { refreshToken } });
      return { ok: true };
    }
    if (userId) {
      await this.prisma.session.deleteMany({ where: { userId } });
      return { ok: true };
    }
    // if neither provided, do nothing
    return { ok: true };
  }

  createAccessToken(userId: string, tokenVersion = 0) {
    const now = Math.floor(Date.now() / 1000);
    const jti = randomBytes(16).toString('hex');
    const payload = { sub: userId, tokenVersion, jti } as any;
    return (jwt as any).sign(payload, JWT_SECRET as string, { expiresIn: ACCESS_TOKEN_EXPIRES_IN as string });
  }

  verifyToken(token: string) {
    try {
      const p = jwt.verify(token, JWT_SECRET) as any;
      return p;
    } catch (e) {
      return null;
    }
  }

  async verifyAccessTokenAndGetUser(token: string) {
    const payload = this.verifyToken(token);
    if (!payload) return null;
    const userId = payload.sub as string || (payload.userId as string);
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    // check token version for revocation
    if (typeof payload.tokenVersion !== 'undefined' && payload.tokenVersion !== user.tokenVersion) return null;
    return { user, payload };
  }
}
