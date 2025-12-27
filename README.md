# kimai-nest prototype

Prototype NestJS service with BullMQ (queues + worker), Cron and Prisma integration.

Quick start

1. Copy environment variables into `.env` (example):

```
DATABASE_URL=postgresql://user:pass@localhost:5432/kimai
REDIS_URL=redis://localhost:6379
PORT=3001
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Run API (includes small in-process worker for prototyping):

```bash
npm run start:dev
```

5. Or run a standalone worker process:

```bash
npm run start:worker
```

Notes
- `src/queue/queue.service.ts` contains a simple in-process worker for quick prototyping. For production run the standalone `src/worker.ts`.
- ML processors should be integrated via HTTP/gRPC to a dedicated ML service, or as a subprocess invoked from the worker.

CI / Container Registry (GHCR)

 - This repository includes GitHub Actions workflows to build and push container images to GitHub Container Registry (GHCR):
	 - `.github/workflows/build-and-push.yml` builds `kimai-backend` and `kimai-ml` and pushes `ghcr.io/<owner>/...` tags on `main`.
	 - `.github/workflows/ci-e2e.yml` builds a test stack via `docker-compose.test.yml` and runs E2E smoke tests.

 - By default the workflows use the built-in `GITHUB_TOKEN` for authentication with GHCR. If you prefer a PAT, add it as the repository secret `GHCR_PAT` and update the workflow to use it.

 - To run E2E locally:
 - To run E2E locally:

```bash
# build and run test stack (requires Docker)
npm run e2e:up
# run e2e tests
npm run test -- test/e2e.spec.ts
# tear down
npm run e2e:down
```

CI Secrets

 - `GHCR_PAT` (optional): Personal Access Token for pushing images to GHCR. If omitted the workflow uses the built-in `GITHUB_TOKEN`.
 - `DATABASE_URL` (optional): If your CI uses an external database instead of the bundled `postgres` service, set this to point to it.
 - `REDIS_URL` (optional): If CI/runner should use an external Redis, set this accordingly.

Add these in the repo Settings → Secrets and variables → Actions.
