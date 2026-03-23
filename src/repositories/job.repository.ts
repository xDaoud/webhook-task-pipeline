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
    return (result.rows[0] as typeof jobs.$inferSelect) ?? null;
}

export async function markJobFailed(id: string, error: string) {
    await db.update(jobs)
    .set({status: 'failed', error: error}).where(eq(jobs.id, id));
}

export async function markJobCompleted(id: string, result: Record<string, unknown>) {
    await db.update(jobs)
    .set({ status: 'completed', result, processedAt: new Date() }).where(eq(jobs.id, id));
}