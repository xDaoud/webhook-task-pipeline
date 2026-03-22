import { insertJob } from "../repositories/job.repository";
import { findPipelineBySourceId } from "../repositories/pipeline.repository";
import { Job } from "../types";

export async function ingestWebhook(
  sourceId: string,
  payload: Record<string, unknown>,
): Promise<Job> {
  const pipeline = await findPipelineBySourceId(sourceId);

  if (!pipeline) {
    throw new Error("PIPELINE_NOT_FOUND");
  }

  if (pipeline.status !== "active") {
    throw new Error('PIPELINE_PAUSED');
  }

  const job = await insertJob({
    pipelineId: pipeline.id,
    payload,
  });

  return {
    ...job,
    payload: job.payload as Record<string, unknown>,
    result: job.result as Record<string, unknown> | null,
    status: job.status as Job['status'],
  };
}
