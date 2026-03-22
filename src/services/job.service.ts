import { findJobById } from "../repositories/job.repository";
import { Job } from "../types";

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