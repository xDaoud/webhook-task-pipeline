import { db } from '../db/client.js';
import { pipelines } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function insertPipeline(data: {
    name: string,
    sourceId: string,
    actionType: string,
    actionConfig: Record<string, unknown>
}) {
    const result = await db.insert(pipelines).values(data).returning();
    return result[0];
}

export async function findPipelineById(id: string): Promise<typeof pipelines.$inferSelect | null> {
  const result = await db.select().from(pipelines).where(eq(pipelines.id, id));
  return result[0] ?? null;
}

export async function findAllPipelines() {
    return db.select().from(pipelines);
}

export async function updatePipelineById(id: string, data: Partial<{
    name: string;
    actionType: string;
    actionConfig: Record<string, unknown>;
    status: 'active' | 'paused';
    updatedAt: Date;
}>): Promise<typeof pipelines.$inferSelect | null> {
    const result = await db.update(pipelines)
    .set(data)
    .where(eq(pipelines.id, id))
    .returning();

    return result[0] ?? null;
}

export async function deletePipelineById(id: string) {
  const result = await db.delete(pipelines).where(eq(pipelines.id, id)).returning();
  return result.length > 0;
}

export async function findPipelineBySourceId(sourceId: string): Promise<typeof pipelines.$inferSelect | null> {
    const result = await db.select().from(pipelines).where(eq(pipelines.sourceId, sourceId));
    return result[0] ?? null;
}