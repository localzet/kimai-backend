import { Job } from 'bullmq';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { INITIAL_SYNC, QUEUE_NAME, REGULAR_SYNC } from './sync.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { inferGrpc } from '../../api/ml/grpc-client';
import { KimaiService } from '../../kimai/kimai.service';

@Processor(QUEUE_NAME, {
    concurrency: 1,
})
export class SyncProcessor extends WorkerHost {
    private readonly logger = new Logger(SyncProcessor.name);

    constructor(private readonly prisma: PrismaService, private readonly kimai: KimaiService) {
        super();
    }

    async process(job: Job) {
        try {
            switch (job.name) {
                case INITIAL_SYNC:
                    return await this.handleInitial(job);
                case REGULAR_SYNC:
                    return await this.handleRegular(job);
                default:
                    this.logger.warn(`Job "${job.name}" is not handled.`);
            }
        } catch (error) {
            this.logger.error(`Error processing job ${job.name}: ${error}`);
            throw error;
        }
    }

    private async handleInitial(job: Job) {
        const { userId } = job.data || {};
        if (!userId) {
            this.logger.warn('INITIAL_SYNC job missing userId');
            return;
        }

        const now = new Date();
        const since = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString();
        const until = now.toISOString();

        await this.fetchAndStoreTimesheets(userId, since, until);

        await this.prisma.syncState.upsert({
            where: { userId },
            update: { syncStatus: 'synced' },
            create: { userId, syncStatus: 'synced' },
        });
        return { ok: true };
    }

    private async handleRegular(job: Job) {
        const { userId, since: s, until: u } = job.data || {};
        if (!userId) {
            this.logger.warn('REGULAR_SYNC job missing userId');
            return;
        }

        const since = s ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const until = u ?? new Date().toISOString();

        await this.fetchAndStoreTimesheets(userId, since, until);

        await this.prisma.syncState.upsert({
            where: { userId },
            update: { syncStatus: 'synced' },
            create: { userId, syncStatus: 'synced' },
        });
        return { ok: true };
    }

    private async fetchAndStoreTimesheets(userId: string, since: string, until: string) {
        try {
            const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
            if (!settings) throw new Error('no_settings');

            const rows = await this.kimai.getTimesheets({ apiUrl: settings.kimaiApiUrl, apiKey: settings.kimaiApiKey, timeoutMs: 20000 }, since, until);

            for (const t of rows) {
                const kimaiId = t.id as number | undefined;
                const begin = t.begin ? new Date(t.begin) : new Date();
                const end = t.end ? new Date(t.end) : null;
                const duration = t.duration ?? null;
                const projectId = t.project?.id ?? null;
                const projectName = t.project?.name ?? null;
                const activityId = t.activity?.id ?? null;
                const activityName = t.activity?.name ?? null;
                const description = t.comment ?? t.description ?? null;
                const tags = t.tags ?? [];
                const meta = t.meta ?? null;

                try {
                    await this.prisma.timesheet.upsert({
                        where: { userId_kimaiId: { userId, kimaiId: kimaiId as any } },
                        update: {
                            begin,
                            end,
                            duration,
                            projectId,
                            projectName,
                            activityId,
                            activityName,
                            description,
                            tags,
                            metaFields: meta,
                        },
                        create: {
                            userId,
                            kimaiId,
                            begin,
                            end,
                            duration,
                            projectId,
                            projectName,
                            activityId,
                            activityName,
                            description,
                            tags,
                            metaFields: meta,
                        },
                    });
                } catch (e: any) {
                    this.logger.warn('upsert failed for timesheet ' + kimaiId + ' ' + (e?.message ?? e));
                }
            }
        } catch (e) {
            this.logger.error('fetchAndStoreTimesheets error ' + e);
            throw e;
        }
    }
}