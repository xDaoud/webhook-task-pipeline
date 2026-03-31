export type PipelineStatus = "active" | "paused";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type DeliveryStatus = "pending" | "success" | "failed" | "dead";

export interface Pipeline {
  id: string;
  name: string;
  sourceId: string;
  actionType: ActionType;
  actionConfig: ActionConfig;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  signingSecret: string;
}

export interface Subscriber {
  id: string;
  pipelineId: string;
  url: string;
  createdAt: Date;
}

export interface Job {
  id: string;
  pipelineId: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface Delivery {
  id: string;
  jobId: string;
  subscriberId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  httpStatus: number | null;
  error: string | null;
  attemptedAt: Date | null;
  nextRetryAt: Date | null;
}

export type ActionType = "filter" | "transform" | "enrich";

export interface FilterConfig {
  keepFields: string[];
  [key: string]: unknown;
}

export interface TransformConfig {
  rename: Record<string, string>;
  [key: string]: unknown;
}

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
  subscribers: string[];
}

export interface UpdatePipelineBody {
  name?: string;
  actionType?: ActionType;
  actionConfig?: ActionConfig;
  status?: PipelineStatus;
  subscribers?: string[];
}
