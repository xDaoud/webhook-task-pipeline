import { db } from "../db/client.js";
import { deliveries } from "../db/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { DeliveryStatus } from "src/types/index.js";

export async function findDeliveriesByJobId(jobId: string) {
  return db.select().from(deliveries).where(eq(deliveries.jobId, jobId));
}

export async function insertDelivery(data: {
  jobId: string;
  subscriberId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  httpStatus?: number;
  error?: string;
  attemptedAt: Date;
  nextRetryAt?: Date;
}) {
  const result = await db.insert(deliveries).values(data).returning();
  return result[0];
}

export async function findDeliveriesDueForRetry() {
  return db.select().from(deliveries).where(
    and(eq(deliveries.status, 'failed'),
    lte(deliveries.nextRetryAt, new Date())
    )
  );
}

export async function updateDeliveryStatus(id: string, data: Partial<{
  status: DeliveryStatus;
  httpStatus: number;
  error: string;
  attemptedAt: Date;
  nextRetryAt: Date;
}>): Promise<typeof deliveries.$inferSelect | null> {
  const result = await db.update(deliveries).set(data).where(eq(deliveries.id, id)).returning();
  return result[0] ?? null;
}