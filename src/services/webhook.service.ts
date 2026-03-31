import { insertJob } from "../repositories/job.repository.js";
import { findPipelineBySourceId } from "../repositories/pipeline.repository.js";
import { NotFoundError, ConflictError } from "../api/middleware/errors.js";
import { Job } from "../types/index.js";

/**
 * Phase 1 of the pipeline: validate and enqueue a webhook event as a job.
 *
 * This function returns as soon as the job is written to the database.
 * The actual action (filter/transform/enrich) and delivery to subscribers
 * happen asynchronously in the worker process (Phase 2).
 */
export async function ingestWebhook(
  sourceId: string,
  payload: Record<string, unknown>,
): Promise<Job> {
  const pipeline = await findPipelineBySourceId(sourceId);

  if (!pipeline) {
    throw new NotFoundError("PIPELINE_NOT_FOUND");
  }

  // Reject new events for paused pipelines so operators can safely stop ingestion
  if (pipeline.status !== "active") {
    throw new ConflictError("PIPELINE_PAUSED");
  }

  const job = await insertJob({
    pipelineId: pipeline.id,
    payload,
  });

  return {
    ...job,
    payload: job.payload as Record<string, unknown>,
    result: job.result as Record<string, unknown> | null,
    status: job.status as Job["status"],
  };
}
