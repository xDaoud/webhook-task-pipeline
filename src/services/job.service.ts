import { findDeliveriesByJobId } from "../repositories/delivery.repository.js";
import { findJobById } from "../repositories/job.repository.js";
import { NotFoundError } from "../api/middleware/errors.js";
import { Delivery, Job } from "../types/index.js";

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
