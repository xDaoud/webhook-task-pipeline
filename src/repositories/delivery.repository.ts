import { db } from "../db/client";
import { deliveries } from "../db/schema";
import { eq } from "drizzle-orm";

export async function findDeliveriesByJobId(jobId: string) {
  return db.select().from(deliveries).where(eq(deliveries.jobId, jobId));
}