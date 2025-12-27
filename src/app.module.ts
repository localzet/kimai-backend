import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { CronService } from './cron/cron.service';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, QueueModule, AuthModule, ApiModule],
  providers: [CronService]
})
export class AppModule {}
