import { Body, Controller, Get, Put, UseGuards, UnauthorizedException, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { QueueService } from '../queue/queue.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

class UpdateSettingsDto {
  kimai_api_url?: string;
  kimai_api_key?: string;
  rate_per_minute?: number;
  project_settings?: any;
  excluded_tags?: string[];
  calendar_sync?: any;
}

@Controller('api')
export class SettingsController {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  @UseGuards(JwtAuthGuard)
  @Get('settings')
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
  @Put('settings')
  async updateSettings(@Req() req: any, @Body() body: UpdateSettingsDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const kimaiUrl = body.kimai_api_url ?? '';
    const kimaiKey = body.kimai_api_key ?? '';

    // validate credentials if provided
    if (kimaiUrl && kimaiKey) {
      try {
        const url = kimaiUrl.replace(/\/+$/, '') + '/api/users/current';
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
    await this.queue.addJob('initial-sync', { userId });

    // fetch projects from Kimai to return to frontend for configuration
    let projects: any[] = [];
    try {
      const KimaiClient = (await import('../kimai/kimai.service')).KimaiClient;
      const client = new KimaiClient({ apiUrl: settings.kimaiApiUrl, apiKey: settings.kimaiApiKey });
      projects = await client.getProjects();
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
