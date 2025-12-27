import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';

import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';

import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';
import { QUEUE_NAME } from './sync.constants';

import { PrismaModule } from '../../prisma/prisma.module';
import { KimaiModule } from '../../kimai/kimai.module';

@Module({
    imports: [
        CqrsModule,

        BullModule.registerQueue({ name: QUEUE_NAME }),
        BullBoardModule.forFeature({ name: QUEUE_NAME, adapter: BullMQAdapter }),
        PrismaModule,
        KimaiModule,
        // Analytics queue coexists alongside sync queue
        // (AnalyticsModule imported in QueueModule if needed)
    ],
    providers: [
        SyncProcessor,
        SyncService,
    ],
    exports: [
        SyncService,
    ],
})
export class SyncQueueModule { }
