import { PrismaService } from '../src/prisma/prisma.service';
import { MlService } from '../src/api/ml/ml.service';

async function run() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const userId = `test-integration-${Date.now()}`;

  // create minimal user
  await prisma.user.create({ data: { id: userId, mixId: `mix-${userId}` } }).catch(() => {});

  const ml = new MlService(prisma);

  const payload = {
    timesheets: [
      {
        id: 12345,
        begin: new Date().toISOString(),
        end: new Date().toISOString(),
        duration: 60,
        project: { id: 1, name: 'integration' },
        activity: { id: 1, name: 'test' },
        comment: 'integration test',
        tags: [],
      },
    ],
    weeks: [],
    settings: {},
    kind: 'integration-test',
  };

  try {
    console.log('Calling ML infer...');
    const res = await ml.infer(userId, payload as any);
    console.log('ML inference result:', res);
  } catch (e) {
    console.error('ML infer failed (make sure ML gRPC server is running at ML_GRPC_HOST):', e);
    process.exitCode = 2;
    await prisma.$disconnect();
    return;
  }

  // check persisted mlResult
  const rows = await prisma.mlResult.findMany({ where: { userId } });
  console.log('mlResult rows for user:', rows.length);
  if (rows.length === 0) process.exitCode = 3;

  await prisma.$disconnect();
}

run();
