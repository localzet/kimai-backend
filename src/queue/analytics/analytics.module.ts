import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';

import { AnalyticsProcessor } from './analytics.processor';
import { AnalyticsService } from './analytics.service';
import { QUEUE_NAME } from './analytics.constants';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: QUEUE_NAME }),
        BullBoardModule.forFeature({ name: QUEUE_NAME, adapter: BullMQAdapter }),
        PrismaModule,
    ],
    providers: [AnalyticsProcessor, AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
