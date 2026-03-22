import { db } from "../db/client";
import { jobs } from "../db/schema";

export async function insertJob(data: {
    pipelineId: string;
    payload: Record<string, unknown>
}) {
    const result = await db.insert(jobs).values(data).returning();
    return result[0];
}