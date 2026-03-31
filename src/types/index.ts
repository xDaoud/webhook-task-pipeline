// Pipeline lifecycle: active → paused (webhooks rejected when paused)
export type PipelineStatus = "active" | "paused";
// Job lifecycle: pending → processing → completed | failed
export type JobStatus = "pending" | "processing" | "completed" | "failed";
// Delivery lifecycle: pending → success | failed → dead (after max attempts)
export type DeliveryStatus = "pending" | "success" | "failed" | "dead";

/** A pipeline defines how incoming webhooks are transformed and where results are delivered. */
export interface Pipeline {
  id: string;
  name: string;
  /** Public identifier used in the webhook URL: POST /webhooks/:sourceId */
  sourceId: string;
  actionType: ActionType;
  actionConfig: ActionConfig;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  /** HMAC-SHA256 secret used to verify the X-Webhook-Signature header on incoming webhooks. */
  signingSecret: string;
}

/** A subscriber is an HTTP endpoint that receives the transformed job result. */
export interface Subscriber {
  id: string;
  pipelineId: string;
  url: string;
  createdAt: Date;
}

/** A job represents a single webhook event moving through the pipeline. */
export interface Job {
  id: string;
  pipelineId: string;
  /** Raw incoming webhook body. */
  payload: Record<string, unknown>;
  /** The transformed payload after the pipeline action runs. Null until processing completes. */
  result: Record<string, unknown> | null;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

/** An audit record for each delivery attempt to a subscriber. */
export interface Delivery {
  id: string;
  jobId: string;
  subscriberId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  httpStatus: number | null;
  error: string | null;
  attemptedAt: Date | null;
  /** When to next retry a failed delivery. Null on success or after going dead. */
  nextRetryAt: Date | null;
}

export type ActionType = "filter" | "transform" | "enrich";

/** Keep only the specified top-level fields from the payload. */
export interface FilterConfig {
  keepFields: string[];
  [key: string]: unknown;
}

/** Rename top-level payload keys. Fields not listed are passed through unchanged. */
export interface TransformConfig {
  /** Map of { oldKey: newKey } pairs. */
  rename: Record<string, string>;
  [key: string]: unknown;
}

/** Merge additional static fields into the payload. Existing keys are overwritten. */
export interface EnrichConfig {
  addFields: Record<string, unknown>;
  [key: string]: unknown;
}

export type ActionConfig = FilterConfig | TransformConfig | EnrichConfig;

export interface PipelineWithSubscribers extends Pipeline {
  subscribers: Subscriber[];
}

export interface CreatePipelineBody {
  name: string;
  actionType: ActionType;
  actionConfig: ActionConfig;
  /** List of subscriber URLs to register for this pipeline. At least one required. */
  subscribers: string[];
}

export interface UpdatePipelineBody {
  name?: string;
  actionType?: ActionType;
  actionConfig?: ActionConfig;
  status?: PipelineStatus;
  /** If provided, replaces all existing subscribers for the pipeline. */
  subscribers?: string[];
}
