import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { CronService } from './cron/cron.service';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisConnectionOptions } from './utils/get-redis-connection-options';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),

    ScheduleModule.forRoot(),
    QueueModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        return {
          stores: [
            createKeyv(
              {
                ...getRedisConnectionOptions(
                  configService.get<string>('REDIS_SOCKET'),
                  configService.get<string>('REDIS_HOST'),
                  configService.get<number>('REDIS_PORT'),
                  'node-redis',
                ),
                database: configService.getOrThrow<number>('REDIS_DB'),
                password: configService.get<string | undefined>('REDIS_PASSWORD'),
              },
              {
                namespace: 'kimai',
                keyPrefixSeparator: ':',
              },
            ),
          ],
        };
      },
    }),

    AuthModule,
    ApiModule
  ],
  providers: [CronService]
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`${signal} signal received, shutting down...`);
  }
}
