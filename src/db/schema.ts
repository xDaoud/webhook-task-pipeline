import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";

// Postgres enums are created once in the database; changing values requires a migration.
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "success",
  "failed",
  "dead",
]);
export const pipelineStatusEnum = pgEnum("pipeline_status", [
  "active",
  "paused",
]);

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Used as the public URL slug: POST /webhooks/:sourceId
  sourceId: text("source_id").notNull().unique(),
  actionType: text("action_type").notNull(),
  // Stored as JSONB to support different action config shapes (FilterConfig, TransformConfig, etc.)
  actionConfig: jsonb("action_config").notNull().default({}),
  status: pipelineStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  signingSecret: text("signing_secret").notNull(),
});

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Prevent duplicate subscriber URLs per pipeline
  (t) => [unique("subscribers_pipeline_id_url_unique").on(t.pipelineId, t.url)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    // Raw incoming webhook body
    payload: jsonb("payload").notNull(),
    // Populated after the pipeline action runs successfully
    result: jsonb("result"),
    status: jobStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (t) => [
    // Status index used by the worker to efficiently poll for pending jobs
    index("jobs_status_idx").on(t.status),
    index("jobs_pipeline_id_idx").on(t.pipelineId),
  ],
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: deliveryStatusEnum("status").notNull().default("pending"),
    httpStatus: integer("http_status"),
    error: text("error"),
    attemptedAt: timestamp("attempted_at"),
    // Null on success or dead deliveries; used by the retry poller to find due retries
    nextRetryAt: timestamp("next_retry_at"),
  },
  (t) => [
    index("deliveries_job_id_idx").on(t.jobId),
    // Index on nextRetryAt so the retry poller query (WHERE next_retry_at <= now) is fast
    index("deliveries_next_retry_at_idx").on(t.nextRetryAt),
  ],
);
