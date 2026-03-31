import { findPipelineById } from "../repositories/pipeline.repository.js";
import {
  claimNextJob,
  markJobCompleted,
  markJobFailed,
} from "../repositories/job.repository.js";
import { runAction } from "../actions/index.js";
import { ActionConfig, ActionType } from "../types/index.js";
import { deliverToSubscribers } from "./deliver.js";

/**
 * Phase 2 of the pipeline: claim and process one pending job.
 *
 * Flow:
 *  1. Atomically claim the oldest pending job (returns null if queue is empty)
 *  2. Run the pipeline's configured action on the raw payload
 *  3. Mark the job completed and fan out the result to all subscribers
 *
 * Returns true if a job was found (whether it succeeded or failed),
 * false if the queue was empty. The worker uses this to decide whether
 * to sleep before polling again.
 */
export async function processNextJob() {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    const pipeline = await findPipelineById(job.pipelineId);
    if (!pipeline) {
      // Pipeline was deleted after the job was queued; fail fast
      await markJobFailed(job.id, "Pipeline not found");
      return true;
    }

    const result = runAction(
      pipeline.actionType as ActionType,
      pipeline.actionConfig as ActionConfig,
      job.payload as Record<string, unknown>,
    );

    await markJobCompleted(job.id, result);
    // Deliver the transformed result to every subscriber; failures are tracked in deliveries
    await deliverToSubscribers(job.id, job.pipelineId, result);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markJobFailed(job.id, message);
    return true;
  }
}
