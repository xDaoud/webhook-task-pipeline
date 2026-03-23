import { db } from '../db/client.js';
import { subscribers } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export async function insertSubscribers(data: { pipelineId: string; url: string }[]) {
  const result = await db.insert(subscribers).values(data).returning();
  return result;
}

export async function findSubscribersByPipelineIds(pipelineIds: string[]) {
  return db.select().from(subscribers).where(inArray(subscribers.pipelineId, pipelineIds));
}

export async function deleteSubscriberByPipelineId(pipelineId: string): Promise<void> {
  await db.delete(subscribers).where(eq(subscribers.pipelineId, pipelineId));
}

export async function findSubscribersByIds(ids: string[]) {
  return db.select().from(subscribers).where(inArray(subscribers.id, ids));
}