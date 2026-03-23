# Webhook Task Pipeline

A webhook-driven task processing pipeline. Receive webhooks, transform them through configurable actions, and deliver results to registered subscribers — like a simplified Zapier.

## What it does

Users create **pipelines** that connect three things:
- A **source URL** that accepts incoming webhooks
- A **processing action** that transforms the data
- **Subscribers** — one or more URLs that receive the result

When a webhook hits a pipeline's source URL, it's queued as a background job. A worker picks it up, runs the action, and delivers the result to all subscribers with automatic retry on failure.

## Quick start

```bash
git clone <repo-url>
cd webhook-task-pipeline
cp .env.example .env   # fill in your values
docker compose up --build
```

The API is available at `http://localhost:3000`.

## Environment variables

```env
POSTGRES_DB=webhook_pipeline
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_PORT=5433
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5433/webhook_pipeline
```

## API

### Pipelines

#### Create a pipeline
```
POST /pipelines
```
```json
{
  "name": "Filter order events",
  "actionType": "filter",
  "actionConfig": { "keepFields": ["orderId", "total"] },
  "subscribers": ["https://your-service.com/webhook"]
}
```

Response `201`:
```json
{
  "id": "uuid",
  "sourceId": "uuid",
  "name": "Filter order events",
  "actionType": "filter",
  "actionConfig": { "keepFields": ["orderId", "total"] },
  "status": "active",
  "subscribers": [{ "id": "uuid", "url": "https://your-service.com/webhook" }],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get all pipelines
```
GET /pipelines
```

#### Get a pipeline
```
GET /pipelines/:id
```

#### Update a pipeline
```
PATCH /pipelines/:id
```
```json
{
  "name": "Renamed pipeline",
  "status": "paused"
}
```
All fields are optional. Sending `subscribers` replaces the existing list.

#### Delete a pipeline
```
DELETE /pipelines/:id
```
Response `204`. Cascades to subscribers, jobs, and deliveries.

---

### Webhooks

#### Ingest a webhook
```
POST /webhooks/:sourceId
```
Send any JSON body. The `sourceId` comes from the pipeline's `sourceId` field.

Response `202`:
```json
{
  "jobId": "uuid",
  "status": "pending"
}
```

The webhook is queued immediately. Use the `jobId` to track processing.

---

### Jobs

#### Get job status
```
GET /jobs/:id
```
```json
{
  "id": "uuid",
  "pipelineId": "uuid",
  "payload": { "original": "data" },
  "result": { "filtered": "data" },
  "status": "completed",
  "attemptCount": 1,
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "processedAt": "2024-01-01T00:00:00.001Z"
}
```

Job statuses: `pending` → `processing` → `completed` | `failed`

#### Get job deliveries
```
GET /jobs/:id/deliveries
```
```json
[
  {
    "id": "uuid",
    "subscriberId": "uuid",
    "attemptNumber": 1,
    "status": "success",
    "httpStatus": 200,
    "error": null,
    "attemptedAt": "2024-01-01T00:00:00.000Z",
    "nextRetryAt": null
  }
]
```

Delivery statuses: `pending` → `success` | `failed` → `dead`

---

### Action types

#### `filter` — keep only specified fields
```json
{
  "actionType": "filter",
  "actionConfig": { "keepFields": ["orderId", "total", "email"] }
}
```

#### `transform` — rename fields
```json
{
  "actionType": "transform",
  "actionConfig": { "rename": { "userId": "id", "userName": "name" } }
}
```

#### `enrich` — add fields to the payload
```json
{
  "actionType": "enrich",
  "actionConfig": { "addFields": { "source": "webhook", "version": "1.0" } }
}
```

---

## Architecture

### System overview

```
External service
      ↓
POST /webhooks/:sourceId   (API server)
      ↓
Insert job → 202 Accepted  (immediate response)
      ↓
Worker polls jobs table
      ↓
Run action on payload
      ↓
POST result to each subscriber
      ↓
Record delivery attempt
```

### Two-phase design

The system is split into two completely independent phases that communicate only through the database:

**Phase 1 — Ingest** (API server): Receives the webhook, validates the pipeline, inserts a job, and responds `202` immediately. Never blocks on processing.

**Phase 2 — Process** (Worker): Polls for pending jobs, runs the action, delivers results to subscribers, handles retries. Completely decoupled from HTTP.

`POST /webhooks/:sourceId` is the bridge — it's the only point where Phase 1 hands off to Phase 2, by writing a row to the `jobs` table.

### Project structure

```
src/
  api/
    routes/         HTTP handlers only — no business logic
  services/         Business logic — orchestrates repositories
  repositories/     Database queries — one file per table
  actions/          Pure transformation functions
  worker/
    processor.ts    Claims and processes jobs
    deliver.ts      HTTP delivery + backoff logic
    retry.ts        Retry poller for failed deliveries
    index.ts        Polling loops + graceful shutdown
  db/
    schema.ts       Drizzle ORM schema
    client.ts       Database connection
  types/
    index.ts        Shared TypeScript interfaces
```

### Database schema

Four tables, each with a single responsibility:

| Table | Role |
|---|---|
| `pipelines` | Configuration — defines what to do with incoming webhooks |
| `subscribers` | Routing — where to send the processed result |
| `jobs` | Queue — tracks every webhook event and its processing state |
| `deliveries` | Audit log — records every delivery attempt with full history |

### Atomic job claiming

The worker uses `FOR UPDATE SKIP LOCKED` to claim jobs atomically:

```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *
```

This allows multiple workers to run in parallel without double-processing any job. A locked row is skipped entirely rather than waited on.

---

## Design decisions

### Database as message queue

Rather than introducing a separate queue service (Redis, RabbitMQ), jobs are stored directly in PostgreSQL. This gives durability for free — if the worker crashes, pending jobs survive in the database. It also gives full visibility — you can query job history at any time with a simple SQL query.

### Repository pattern

Database queries are isolated in repository files (one per table). Services contain business logic and call repositories. Routes handle HTTP and call services. This strict layering means each concern is independently testable — services are tested by mocking repositories, with no database required.

### N+1 query prevention

`GET /pipelines` fetches all subscribers in a single query using `IN (...)` rather than one query per pipeline. This keeps the endpoint at a fixed 2 queries regardless of how many pipelines exist.

### Subscriber uniqueness constraint

A composite unique constraint on `(pipeline_id, url)` prevents the same subscriber URL from being registered twice on the same pipeline — which would cause duplicate deliveries.

### Exponential backoff for retries

Failed deliveries are retried at increasing intervals: 1 minute, 5 minutes, 30 minutes, 60 minutes, 180 minutes. After 5 attempts the delivery is marked `dead`. This prevents hammering a temporarily unavailable subscriber while still giving it a reasonable chance to recover.

### Delivery as audit log

Each delivery attempt creates a new row rather than updating an existing one. This preserves the full history — when each attempt fired, what the response was, and when the next retry was scheduled. The `GET /jobs/:id/deliveries` endpoint exposes this history directly.

### Cascade deletes

Deleting a pipeline cascades to subscribers, jobs, and deliveries at the database level. No application-level cleanup required — referential integrity is enforced by PostgreSQL.

---

## Running tests

```bash
npm test
```

Tests are co-located with source files (`*.test.ts`). The test suite covers services, repositories, actions, and worker logic using Vitest with mocked dependencies — no database required to run tests.

## CI

GitHub Actions runs on every push: type checking, linting, tests, and a Docker build verification. The pipeline must be green before merging to main.