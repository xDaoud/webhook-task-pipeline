import { findDeliveriesByJobId } from "../repositories/delivery.repository.js";
import { findJobById } from "../repositories/job.repository.js";
import { NotFoundError } from "../api/middleware/errors.js";
import { Delivery, Job } from "../types/index.js";

/** Returns a job by ID. Throws NotFoundError if it doesn't exist. */
export async function getJobById(id: string): Promise<Job> {
  const job = await findJobById(id);

  if (!job) {
    throw new NotFoundError("JOB_NOT_FOUND");
  }

  return {
    ...job,
    payload: job.payload as Record<string, unknown>,
    result: job.result as Record<string, unknown> | null,
    status: job.status as Job["status"],
  };
}

/**
 * Returns all delivery attempts for a job.
 * Validates the job exists first so callers get a clear error for unknown job IDs
 * rather than an empty array that looks like "no deliveries yet".
 */
export async function getJobDeliveries(JobId: string) {
  const job = await findJobById(JobId);

  if (!job) {
    throw new NotFoundError("JOB_NOT_FOUND");
  }

  const jobDeliveries = await findDeliveriesByJobId(job.id);

  return jobDeliveries.map((delivery) => ({
    ...delivery,
    status: delivery.status as Delivery["status"],
  }));
}
