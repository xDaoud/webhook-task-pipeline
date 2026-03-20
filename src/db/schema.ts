import { pgTable, uuid, text, jsonb, integer, timestamp, pgEnum, index, unique } from 'drizzle-orm/pg-core';

export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'success', 'failed', 'dead']);
export const pipelineStatusEnum = pgEnum('pipeline_status', ['active', 'paused']);

export const pipelines = pgTable('pipelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sourceId: text('source_id').notNull().unique(),
  actionType: text('action_type').notNull(),
  actionConfig: jsonb('action_config').notNull().default({}),
  status: pipelineStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  unique('subscribers_pipeline_id_url_unique').on(t.pipelineId, t.url),
]);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  status: jobStatusEnum('status').notNull().default('pending'),
  attemptCount: integer('attempt_count').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (t) => [
  index('jobs_status_idx').on(t.status),
  index('jobs_pipeline_id_idx').on(t.pipelineId),
]);

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull().default(1),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  httpStatus: integer('http_status'),
  error: text('error'),
  attemptedAt: timestamp('attempted_at'),
  nextRetryAt: timestamp('next_retry_at'),
}, (t) => [
  index('deliveries_job_id_idx').on(t.jobId),
  index('deliveries_next_retry_at_idx').on(t.nextRetryAt),
]);
