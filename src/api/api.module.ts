import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { SettingsController } from '../settings/settings.controller';
import { SyncController } from '../sync/sync.controller';
import { TimesheetsController } from '../timesheets/timesheets.controller';
import { HealthController } from '../debug/health.controller';
import { AuthModule } from '../auth/auth.module';
import { MlController } from '../ml/ml.controller';
import { MlModule } from '../ml/ml.module';

@Module({
  imports: [PrismaModule, QueueModule, AuthModule, MlModule],
  controllers: [SettingsController, SyncController, TimesheetsController, MlController, HealthController],
})
export class ApiModule {}
