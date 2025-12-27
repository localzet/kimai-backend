import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(private readonly queueService: QueueService, private readonly prisma: PrismaService) {}

  // Daily job: enqueue sync for 1-week-ago period (runs at 00:05)
  @Cron('0 5 0 * * *')
  async dailySync() {
    this.logger.log('daily sync: enqueue jobs for all users');
    const users = await this.prisma.userSettings.findMany();
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const until = now.toISOString();
    for (const s of users) {
      const userId = s.userId;
      await this.prisma.syncState.upsert({ where: { userId }, update: { syncStatus: 'syncing' }, create: { userId, syncStatus: 'syncing' } });
      await this.queueService.addJob('regular-sync', { userId, since, until });
    }
  }

  // Every 15 minutes: enqueue sync for last 24 hours
  @Cron('0 */15 * * * *')
  async frequentSync() {
    this.logger.log('frequent sync: enqueue jobs for all users');
    const users = await this.prisma.userSettings.findMany();
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const until = now.toISOString();
    for (const s of users) {
      const userId = s.userId;
      await this.prisma.syncState.upsert({ where: { userId }, update: { syncStatus: 'syncing' }, create: { userId, syncStatus: 'syncing' } });
      await this.queueService.addJob('regular-sync', { userId, since, until });
    }
  }
}
