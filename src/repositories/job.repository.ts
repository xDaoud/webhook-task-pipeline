import { db } from "../db/client.js";
import { jobs } from "../db/schema.js";
import { eq } from "drizzle-orm";

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