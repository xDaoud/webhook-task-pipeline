import { db } from '../db/client';
import { subscribers } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function insertSubscribers(data: { pipelineId: string; url: string }[]) {
  const result = await db.insert(subscribers).values(data).returning();
  return result;
}

export async function findSubscribersByPipelineIds(pipelineIds: string[]) {
  return db.select().from(subscribers).where(inArray(subscribers.pipelineId, pipelineIds));
}

export async function deleteSubscriberByPipelineId(pipelineId: string) {
  return db.delete(subscribers).where(eq(subscribers.pipelineId, pipelineId));
}