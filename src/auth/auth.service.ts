import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const SESSION_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async createSession(userId: string, ip?: string | null, ua?: string | null) {
    const refreshToken = cryptoRandom();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);

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

    return refreshToken;
  }

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('user_exists');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const mixId = this.generateMixId();
    const user = await this.prisma.user.create({
      data: {
        mixId,
        email,
        passwordHash: hash,
      },
    });

    // create initial sync state
    await this.prisma.syncState.create({
      data: {
        userId: user.id,
        syncStatus: 'idle',
      },
    }).catch(()=>{});

    const token = this.createToken(user.id, mixId, user.tokenVersion);
    const refresh = await this.createSession(user.id);

    return { token, userId: user.id, refreshToken: refresh };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new Error('invalid_credentials');
    const token = this.createToken(user.id, user.mixId, user.tokenVersion);
    const refresh = await this.createSession(user.id);
    return { token, userId: user.id, refreshToken: refresh };
  }

  async refreshSession(refreshToken: string) {
    const s = await this.prisma.session.findUnique({ where: { refreshToken } });
    if (!s) throw new Error('invalid_refresh');
    if (s.expiresAt < new Date()) throw new Error('refresh_expired');
    // update last used
    await this.prisma.session.update({ where: { refreshToken }, data: { lastUsedAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: s.userId } });
    if (!user) throw new Error('user_not_found');
    const token = this.createToken(user.id, user.mixId, user.tokenVersion);
    return { token, userId: user.id };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({ where: { refreshToken } });
    }
    return true;
  }

  createToken(userId: string, mixId: string, tokenVersion = 0) {
    const payload = { userId, mixId, tokenVersion };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (e) {
      return null;
    }
  }

  private generateMixId() {
    return cryptoRandom();
  }
}

function cryptoRandom() {
  return 'm_' + Math.random().toString(36).slice(2, 10);
}
