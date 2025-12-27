import { Queue } from 'bullmq';
import _ from 'lodash';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AbstractQueueService } from '../queue.service';
import { QUEUE_NAME, ANALYTICS_RUN } from './analytics.constants';

@Injectable()
export class AnalyticsService extends AbstractQueueService implements OnApplicationBootstrap {
    protected readonly logger: Logger = new Logger(_.upperFirst(_.camelCase(QUEUE_NAME)));

    private _queue: Queue;

    get queue(): Queue {
        return this._queue;
    }

    constructor(
        @InjectQueue(QUEUE_NAME)
        private readonly analyticsQueue: Queue,
    ) {
        super();
        this._queue = this.analyticsQueue;
    }

    public async onApplicationBootstrap(): Promise<void> {
        await this.checkConnection();
        await this.queue.setGlobalConcurrency(1);
    }

    public async startAnalytics(payload: { userId: string, params?: any }) {
        return this.addJob(ANALYTICS_RUN, payload);
    }
}
