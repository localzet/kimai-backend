import { Controller, Post, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('api/sync')
export class SyncController {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  @UseGuards(JwtAuthGuard)
  @Post('trigger')
  async trigger(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.prisma.syncState.upsert({ where: { userId }, update: { syncStatus: 'syncing' }, create: { userId, syncStatus: 'syncing' } });
    await this.queue.addJob('initial-sync', { userId });
    return { status: 'triggered', message: 'Sync started' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('status')
  async status(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const s = await this.prisma.syncState.findUnique({ where: { userId } });
    return { status: s?.syncStatus ?? 'unknown' };
  }
}
