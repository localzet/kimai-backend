import { Queue } from 'bullmq';
import _ from 'lodash';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AbstractQueueService } from '../queue.service';
import { INITIAL_SYNC, QUEUE_NAME, REGULAR_SYNC } from './sync.constants';

@Injectable()
export class SyncService extends AbstractQueueService implements OnApplicationBootstrap {
    protected readonly logger: Logger = new Logger(
        _.upperFirst(_.camelCase(QUEUE_NAME)),
    );

    private _queue: Queue;

    get queue(): Queue {
        return this._queue;
    }

    constructor(
        @InjectQueue(QUEUE_NAME)
        private readonly squadsQueue: Queue,
    ) {
        super();
        this._queue = this.squadsQueue;
    }

    public async onApplicationBootstrap(): Promise<void> {
        await this.checkConnection();
        await this.queue.setGlobalConcurrency(1);
    }

    public async startInitialSync(payload: { userId: string }) {
        return this.addJob(INITIAL_SYNC, payload);
    }

    public async startRegularSync(payload: { userId: string, since: string, until: string }) {
        return this.addJob(REGULAR_SYNC, payload);
    }
}