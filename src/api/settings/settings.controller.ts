import { Body, Controller, Get, Put, UseGuards, UnauthorizedException, Req } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { SyncService } from '../../queue/sync/sync.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { KimaiService } from '../../kimai/kimai.service';
import * as dns from 'dns';

class UpdateSettingsDto {
  kimai_api_url?: string;
  kimai_api_key?: string;
  rate_per_minute?: number;
  project_settings?: any;
  excluded_tags?: string[];
  calendar_sync?: any;
}

@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService, private sync: SyncService, private kimai: KimaiService) {}

  private isPrivateIpAddress(ip: string): boolean {
    // IPv6 loopback
    if (ip === '::1') {
      return true;
    }

    // IPv4 checks
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return false;
    }

    const [a, b] = parts;

    // 10.0.0.0/8
    if (a === 10) {
      return true;
    }

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    // 192.168.0.0/16
    if (a === 192 && b === 168) {
      return true;
    }

    // 127.0.0.0/8 (loopback)
    if (a === 127) {
      return true;
    }

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) {
      return true;
    }

    return false;
  }

  private async validateKimaiUrl(kimaiUrl: string): Promise<string> {
    let parsed: URL;
    try {
      parsed = new URL(kimaiUrl);
    } catch {
      throw new UnauthorizedException('kimai_invalid_url');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UnauthorizedException('kimai_invalid_url');
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost') {
      throw new UnauthorizedException('kimai_invalid_host');
    }

    try {
      const lookupResult = await dns.promises.lookup(hostname);
      if (this.isPrivateIpAddress(lookupResult.address)) {
        throw new UnauthorizedException('kimai_invalid_host');
      }
    } catch (err) {
      // If DNS lookup fails for other reasons, treat as invalid host
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('kimai_invalid_host');
    }

    // normalize by removing trailing slashes from origin + pathname
    const base = (parsed.origin + parsed.pathname).replace(/\/+$/, '');
    return base;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!s) return {};
    return {
      kimai_api_url: s.kimaiApiUrl,
      kimai_api_key: s.kimaiApiKey,
      rate_per_minute: s.ratePerMinute,
      project_settings: s.projectSettings,
      excluded_tags: s.excludedTags,
      calendar_sync: s.calendarSync,
      user_preferences: s.userPreferences,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateSettings(@Req() req: any, @Body() body: UpdateSettingsDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const kimaiUrl = body.kimai_api_url ?? '';
    const kimaiKey = body.kimai_api_key ?? '';

    // validate credentials if provided
    if (kimaiUrl && kimaiKey) {
      try {
        const safeBaseUrl = await this.validateKimaiUrl(kimaiUrl);
        const url = safeBaseUrl + '/api/users/current';
        await axios.get(url, { headers: { 'X-AUTH-API-TOKEN': kimaiKey } });
      } catch (e) {
        throw new UnauthorizedException('kimai_validation_failed');
      }
    }

    const existing = await this.prisma.userSettings.findUnique({ where: { userId } });
    const now = new Date();
    let settings;
    if (existing) {
      settings = await this.prisma.userSettings.update({
        where: { userId },
        data: {
          kimaiApiUrl: kimaiUrl ?? existing.kimaiApiUrl,
          kimaiApiKey: kimaiKey ?? existing.kimaiApiKey,
          ratePerMinute: body.rate_per_minute ?? existing.ratePerMinute,
          projectSettings: body.project_settings ?? existing.projectSettings,
          excludedTags: body.excluded_tags ?? existing.excludedTags,
          calendarSync: body.calendar_sync ?? existing.calendarSync,
          updatedAt: now,
        },
      });
    } else {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          kimaiApiUrl: kimaiUrl ?? '',
          kimaiApiKey: kimaiKey ?? '',
          ratePerMinute: body.rate_per_minute ?? 0,
          projectSettings: body.project_settings ?? {},
          excludedTags: body.excluded_tags ?? [],
          calendarSync: body.calendar_sync ?? null,
        },
      });
    }

    // enqueue initial sync
    await this.prisma.syncState.upsert({ where: { userId }, update: { syncStatus: 'syncing' }, create: { userId, syncStatus: 'syncing' } });
    await this.sync.startInitialSync({ userId });

    // fetch projects from Kimai to return to frontend for configuration
    let projects: any[] = [];
    try {
      projects = await this.kimai.getProjects({ apiUrl: settings.kimaiApiUrl, apiKey: settings.kimaiApiKey });
    } catch (e) {
      // ignore project fetch errors, frontend will fetch directly if needed
      projects = [];
    }

    return {
      kimai_api_url: settings.kimaiApiUrl,
      kimai_api_key: settings.kimaiApiKey,
      rate_per_minute: settings.ratePerMinute,
      project_settings: settings.projectSettings,
      excluded_tags: settings.excludedTags,
      calendar_sync: settings.calendarSync,
      user_preferences: settings.userPreferences,
      created_at: settings.createdAt,
      updated_at: settings.updatedAt,
      projects,
    };
  }
}
