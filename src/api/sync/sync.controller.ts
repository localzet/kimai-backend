import { Controller, Post, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncService } from '../../queue/sync/sync.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@Controller('sync')
export class SyncController {
  constructor(private prisma: PrismaService, private sync: SyncService) {}

  @UseGuards(JwtAuthGuard)
  @Post('trigger')
  async trigger(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.prisma.syncState.upsert({ where: { userId }, update: { syncStatus: 'syncing' }, create: { userId, syncStatus: 'syncing' } });
    await this.sync.startInitialSync({ userId });
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
