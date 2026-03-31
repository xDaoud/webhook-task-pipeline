import {
  findDeliveriesDueForRetry,
  insertDelivery,
} from "../repositories/delivery.repository.js";
import { findJobById } from "../repositories/job.repository.js";
import { findSubscribersByIds } from "../repositories/subscriber.repository.js";
import { getBackoffDelay } from "./deliver.js";

const MAX_ATTEMPTS = 5;

/**
 * Fetches all deliveries due for retry and attempts each one.
 * Called by the retry poller loop every 30 seconds.
 */
export async function processFailedDeliveries() {
  const dueDeliveries = await findDeliveriesDueForRetry();

  for (const delivery of dueDeliveries) {
    await retryDelivery(delivery);
  }
}

/**
 * Retries a single failed delivery.
 * Looks up the job result and subscriber URL, then re-POSTs to the subscriber.
 * Silently skips if the job or subscriber was deleted since the original attempt.
 */
async function retryDelivery(delivery: {
  id: string;
  jobId: string;
  subscriberId: string;
  attemptNumber: number;
}) {
  const job = await findJobById(delivery.jobId);
  if (!job) return;

  const subscriber = await findSubscribersByIds([delivery.subscriberId]);
  if (!subscriber?.length) return;

  // result is null if the job never completed successfully; nothing to redeliver
  const result = job.result as Record<string, unknown>;
  if (!result) return;

  const nextAttemptNumber = delivery.attemptNumber + 1;
  const attemptedAt = new Date();

  try {
    const response = await fetch(subscriber[0].url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (response.ok) {
      await insertDelivery({
        jobId: delivery.jobId,
        subscriberId: delivery.subscriberId,
        attemptNumber: delivery.attemptNumber,
        status: "success",
        httpStatus: response.status,
        attemptedAt,
      });
    } else {
      await handleRetryFailure(
        delivery,
        nextAttemptNumber,
        attemptedAt,
        `HTTP ${response.status}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await handleRetryFailure(delivery, nextAttemptNumber, attemptedAt, message);
  }
}

/**
 * Records a failed retry attempt.
 * Mirrors the logic in deliver.ts: dead-letters at MAX_ATTEMPTS, otherwise schedules
 * the next retry using the shared backoff schedule from getBackoffDelay.
 */
async function handleRetryFailure(
  delivery: { jobId: string; subscriberId: string },
  attemptNumber: number,
  attemptedAt: Date,
  error: string,
) {
  if (attemptNumber >= MAX_ATTEMPTS) {
    await insertDelivery({
      jobId: delivery.jobId,
      subscriberId: delivery.subscriberId,
      attemptNumber,
      status: "dead",
      error,
      attemptedAt,
    });
    return;
  }
  await insertDelivery({
    jobId: delivery.jobId,
    subscriberId: delivery.subscriberId,
    attemptNumber,
    status: "failed",
    error,
    attemptedAt,
    nextRetryAt: getBackoffDelay(attemptNumber),
  });
}
