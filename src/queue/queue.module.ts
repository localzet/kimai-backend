import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisConnectionOptions } from '../utils/get-redis-connection-options';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BasicAuthMiddleware } from '../middlewares/basic-auth.middleware';
import { SyncQueueModule } from './sync/sync.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: {
            ...getRedisConnectionOptions(
              configService.get<string>('REDIS_SOCKET'),
              configService.get<string>('REDIS_HOST'),
              configService.get<number>('REDIS_PORT'),
              'ioredis',
            ),
            db: configService.getOrThrow<number>('REDIS_DB'),
            password: configService.get<string | undefined>('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: 500,
          },
        };
      },
      inject: [ConfigService],
    }),

    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      boardOptions: {
        uiConfig: {
          boardTitle: 'KimaiMQ',
          boardLogo: {
            path: 'https://kimai.geryon.space/touch-icon-192x192.png',
            width: 32,
            height: 32,
          },
          locale: {
            lng: 'en',
          },
          pollingInterval: {
            showSetting: true,
            forceInterval: 3,
          },
        },
      },
      middleware: [BasicAuthMiddleware],
    }),

    SyncQueueModule,
    AnalyticsModule,
  ],
  exports: [
    SyncQueueModule,
    AnalyticsModule,
  ]
})
export class QueueModule { }
