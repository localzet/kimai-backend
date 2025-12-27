import { Job } from 'bullmq';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAME, ANALYTICS_RUN } from './analytics.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { inferGrpc } from '../../api/ml/grpc-client';

@Processor(QUEUE_NAME, { concurrency: 1 })
export class AnalyticsProcessor extends WorkerHost {
    private readonly logger = new Logger(AnalyticsProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job) {
        try {
            switch (job.name) {
                case ANALYTICS_RUN:
                    return await this.handleRun(job);
                default:
                    this.logger.warn(`Job "${job.name}" is not handled.`);
            }
        } catch (error) {
            this.logger.error(`Error processing job ${job.name}: ${error}`);
            throw error;
        }
    }

    private async handleRun(job: Job) {
        const { userId, params } = job.data || {};
        if (!userId) {
            this.logger.warn('ANALYTICS_RUN missing userId');
            return;
        }

        try {
            // Minimal analytics: fetch recent timesheets and call ML with kind 'analytics'
            const since = params?.since ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
            const until = params?.until ?? new Date().toISOString();
            const rows = await this.prisma.timesheet.findMany({ where: { userId, begin: { gte: new Date(since) } } });

            const req = { user_id: userId, timesheets: rows, settings: null, kind: 'analytics' } as any;
            const res = await inferGrpc(req);
            try {
                const parsed = JSON.parse(res.result_json || '{}');
                await this.prisma.mlResult.create({ data: { userId, kind: 'analytics', payload: parsed } as any }).catch(() => {});
            } catch (e) {
                this.logger.error('failed parsing analytics ml result ' + e);
            }
        } catch (e) {
            this.logger.error('analytics run failed ' + e);
            throw e;
        }
    }
}
