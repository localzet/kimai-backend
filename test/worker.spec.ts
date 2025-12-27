const jestObj = require('@jest/globals');

// Mock Prisma client before importing worker
jestObj.jest.mock('@prisma/client', () => ({
  PrismaClient: function PrismaClientMock() {
    return {
      timesheet: { upsert: jestObj.jest.fn().mockResolvedValue({} as any) },
      userSettings: { findUnique: jestObj.jest.fn().mockResolvedValue({ kimaiApiUrl: 'http://example', kimaiApiKey: 'key' } as any) },
      syncState: { upsert: jestObj.jest.fn().mockResolvedValue({} as any) },
      mlResult: { create: jestObj.jest.fn().mockResolvedValue({} as any) },
      user: { create: jestObj.jest.fn().mockResolvedValue({} as any) },
      $connect: jestObj.jest.fn().mockResolvedValue(undefined),
      $disconnect: jestObj.jest.fn().mockResolvedValue(undefined),
    } as any;
  },
}));

// Mock kimai client
jestObj.jest.mock('../src/kimai/kimai.service', () => ({
  KimaiClient: function KimaiClientMock() {
    return {
      getTimesheets: jestObj.jest.fn().mockResolvedValue([
        { id: 1, begin: new Date().toISOString(), end: new Date().toISOString(), duration: 60, project: { id: 1, name: 'p' }, activity: { id: 1, name: 'a' }, comment: 'c', tags: [] },
      ] as any),
    } as any;
  },
}));

// Mock grpc/proto-loader to avoid real network calls
jestObj.jest.mock('@grpc/grpc-js', () => ({
  credentials: { createInsecure: () => ({}) },
}));

jestObj.jest.mock('@grpc/proto-loader', () => ({
  loadSync: () => ({}),
}));

// Mock ioredis to avoid real Redis connections during tests
jestObj.jest.mock('ioredis', () => {
  return function IORedisMock() {
    return {
      quit: jestObj.jest.fn().mockResolvedValue(undefined),
      on: jestObj.jest.fn(),
    };
  };
});

const { fetchAndStoreTimesheets } = require('../src/worker');

describe('worker fetchAndStoreTimesheets', () => {
  it('upserts timesheets and handles ML call without throwing', async () => {
    const settings = { kimaiApiUrl: 'http://example', kimaiApiKey: 'k' };
    await expect(fetchAndStoreTimesheets('user-test', settings, new Date().toISOString(), new Date().toISOString())).resolves.not.toThrow();
  });

  afterAll(() => {
    jestObj.jest.clearAllTimers();
  });
});
