import { findPipelineById } from "../repositories/pipeline.repository.js";
import {
  claimNextJob,
  markJobCompleted,
  markJobFailed,
} from "../repositories/job.repository.js";
import { runAction } from "../actions/index.js";
import { ActionConfig, ActionType } from "../types/index.js";
import { deliverToSubscribers } from "./deliver.js";

export async function processNextJob() {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    const pipeline = await findPipelineById(job.pipelineId);
    if (!pipeline) {
      await markJobFailed(job.id, "Pipeline not found");
      return true;
    }

    const result = runAction(
      pipeline.actionType as ActionType,
      pipeline.actionConfig as ActionConfig,
      job.payload as Record<string, unknown>,
    );

    await markJobCompleted(job.id, result);
    await deliverToSubscribers(job.id, job.pipelineId, result);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markJobFailed(job.id, message);
    return true;
  }
}
