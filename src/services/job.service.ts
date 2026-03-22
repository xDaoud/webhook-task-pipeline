import { findDeliveriesByJobId } from "../repositories/delivery.repository";
import { findJobById } from "../repositories/job.repository";
import { Delivery, Job } from "../types";

export async function getJobById(id: string): Promise<Job | null> {
  const job = await findJobById(id);
  
  if(!job){
    return null;
  }

  return{
    ...job,
    payload: job.payload as Record<string, unknown>,
    result: job.result as Record<string, unknown> | null,
    status: job.status as Job['status'],
  };
}

export async function getJobDeliveries(JobId: string) {
  const job = await findJobById(JobId);

  if(!job){
    throw new Error("JOB_NOT_FOUND");
  }

  const jobDeliveries = await findDeliveriesByJobId(job.id);

  return jobDeliveries.map((delivery) => ({
    ...delivery,
    status: delivery.status as Delivery['status'],
  }));
}