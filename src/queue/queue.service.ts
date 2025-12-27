import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { MlService } from '../ml/ml.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: Redis;
  public queue: Queue;
  private worker: Worker;
  private scheduler: any;

  constructor(private readonly mlService: MlService) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.connection = new IORedis(redisUrl);
    this.queue = new Queue('ml-jobs', { connection: this.connection });
    // QueueScheduler may not be available in all bullmq versions; require at runtime
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { QueueScheduler } = require('bullmq');
      this.scheduler = new QueueScheduler('ml-jobs', { connection: this.connection });
    } catch (e) {
      this.scheduler = null;
    }

    // In-process worker: processes jobs and delegates ML inference to MlService.
    this.worker = new Worker(
      'ml-jobs',
      async (job) => {
        this.logger.log(`processing job ${job.id} ${job.name}`);
        try {
          if (job.name === 'ml-infer') {
            const { userId, payload } = job.data;
            await this.mlService.infer(userId, payload || {});
          }
          return { ok: true };
        } catch (e) {
          this.logger.error(`job ${job.id} failed`, e as any);
          throw e;
        }
      },
      { connection: this.connection }
    );

    this.worker.on('completed', (job) => this.logger.log(`completed ${job.id}`));
    this.worker.on('failed', (job, err) => this.logger.error(`failed ${job?.id}`, err as any));
  }

  async onModuleInit() {
    await this.queue.waitUntilReady();
    this.logger.log('Queue ready');
  }

  async addJob(name: string, data: any, opts?: JobsOptions) {
    return this.queue.add(name, data, opts);
  }

  async onModuleDestroy() {
    if (this.worker) {
      try { await this.worker.close(); } catch (e) { console.warn('worker close error', e); }
    }
    if (this.scheduler) {
      try { await this.scheduler.close(); } catch (e) { console.warn('scheduler close error', e); }
    }
    if (this.queue) {
      try { await this.queue.close(); } catch (e) { console.warn('queue close error', e); }
    }
    if (this.connection) {
      try { await this.connection.quit(); } catch (e) { console.warn('connection quit error', e); }
    }
  }
}
