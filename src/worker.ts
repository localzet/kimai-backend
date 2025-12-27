import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { inferGrpc } from './ml/grpc-client';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl);
const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, '../proto/ml.proto');

let worker: any = null;
if (process.env.NODE_ENV !== 'test') {
  worker = new Worker(
    'ml-jobs',
    async (job) => {
      try {
        if (job.name === 'initial-sync') {
          const { userId } = job.data;
          await handleInitialSync(userId);
        } else if (job.name === 'regular-sync') {
          const { userId, since, until } = job.data;
          await handleRegularSync(userId, since, until);
        }
        return { ok: true };
      } catch (e) {
        console.error('job error', e);
        throw e;
      }
    },
    { connection }
  );

  worker.on('completed', () => {});
  worker.on('failed', (job: any, err: any) => console.error('[standalone-worker] failed', job?.id, err));
}

export async function handleInitialSync(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) throw new Error('no_settings');

  const now = new Date();
  const since = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
  await fetchAndStoreTimesheets(userId, settings, since.toISOString(), now.toISOString());

  await prisma.syncState.upsert({
    where: { userId },
    update: { syncStatus: 'synced' },
    create: { userId, syncStatus: 'synced' },
  });
}

export async function handleRegularSync(userId: string, since?: string, until?: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) throw new Error('no_settings');
  const s = since ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const u = until ?? new Date().toISOString();
  await fetchAndStoreTimesheets(userId, settings, s, u);

  await prisma.syncState.upsert({
    where: { userId },
    update: { syncStatus: 'synced' },
    create: { userId, syncStatus: 'synced' },
  });
}

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

export async function fetchAndStoreTimesheets(userId: string, settings: any, since: string, until: string) {
  try {
    const { KimaiClient } = await import('./kimai/kimai.service');
    const client = new KimaiClient({ apiUrl: settings.kimaiApiUrl, apiKey: settings.kimaiApiKey, timeoutMs: 20000 });
    const rows = await client.getTimesheets(since, until);

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
        await prisma.timesheet.upsert({
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
        console.warn('upsert failed for timesheet', kimaiId, e.message ?? e);
      }
    }

    // build weeks summary
    const weeksMap: Record<string, any[]> = {};
    for (const ts of rows) {
      const d = ts.begin ? new Date(ts.begin) : new Date();
      const year = d.getUTCFullYear();
      const week = getISOWeek(d);
      const key = `${year}-W${week}`;
      weeksMap[key] = weeksMap[key] || [];
      weeksMap[key].push(ts);
    }
    const weeks = Object.keys(weeksMap).map((k) => ({ id: k, entries: weeksMap[k] }));

    // prepare settings for ML (omit API key)
    const mlSettings = settings ? { projectSettings: settings.projectSettings, excludedTags: settings.excludedTags, userPreferences: settings.userPreferences } : null;

    // call ML gRPC service via shared helper
    try {
      const req = { user_id: userId, timesheets: rows, weeks, settings: mlSettings, kind: 'sync' };
      const res = await inferGrpc(req);
      try {
        const parsed = JSON.parse(res.result_json || '{}');
        await prisma.mlResult.create({ data: { userId, kind: 'sync', payload: parsed } as any }).catch(() => {});
      } catch (e) {
        console.error('failed parsing ml result', e);
      }
    } catch (e) {
      console.error('ml call failed', e);
    }
  } catch (e) {
    console.error('fetchAndStoreTimesheets error', e);
    throw e;
  }
}

process.on('SIGINT', async () => {
  try {
    if (worker) {
      await worker.close();
    }
    await connection.quit();
    await prisma.$disconnect();
  } catch (e) {
    console.error('shutdown error', e);
  } finally {
    process.exit(0);
  }
});

