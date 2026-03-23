import { db } from "../db/client.js";
import { jobs } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export async function insertJob(data: {
    pipelineId: string;
    payload: Record<string, unknown>
}) {
    const result = await db.insert(jobs).values(data).returning();
    return result[0];
}

export async function findJobById(id: string): Promise<typeof jobs.$inferSelect | null> {
    const result = await db.select().from(jobs).where(eq(jobs.id, id));
    return result[0] ?? null;
}

export async function claimNextJob(): Promise<typeof jobs.$inferSelect | null> {
    const result = await db.execute(sql`
        UPDATE jobs
        SET status = 'processing', attempt_count = attempt_count + 1
        WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `);
    const row = result.rows[0];
    if(!row) return null;

    return {
    id: row.id,
    pipelineId: row.pipeline_id,
    payload: row.payload,
    result: row.result,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    error: row.error,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  } as typeof jobs.$inferSelect;

}

export async function markJobFailed(id: string, error: string) {
    await db.update(jobs)
    .set({status: 'failed', error: error}).where(eq(jobs.id, id));
}

export async function markJobCompleted(id: string, result: Record<string, unknown>) {
    await db.update(jobs)
    .set({ status: 'completed', result, processedAt: new Date() }).where(eq(jobs.id, id));
}