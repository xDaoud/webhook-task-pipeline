import { insertDelivery } from "../repositories/delivery.repository.js";
import { findSubscribersByPipelineIds } from "../repositories/subscriber.repository.js";
// exported for testing purposes
export { handleFailedDelivery };

const MAX_ATTEMPTS = 5;

/**
 * Calculates the next retry time using a stepped backoff schedule.
 * Delays (in minutes) by attempt number: 1, 5, 30, 60, 180.
 * Once all steps are exhausted, 180 minutes is used as the cap.
 */
export function getBackoffDelay(attemptNumber: number): Date {
  const delays = [1, 5, 30, 60, 180]; // minutes per attempt
  const minutes = delays[attemptNumber - 1] ?? 180;
  const nextRetryAt = new Date();
  nextRetryAt.setMinutes(nextRetryAt.getMinutes() + minutes);
  return nextRetryAt;
}

/**
 * Delivers the job result to every subscriber registered for the pipeline.
 * Each delivery is independent — a failure for one subscriber does not affect others.
 */
export async function deliverToSubscribers(
  jobId: string,
  pipelineId: string,
  result: Record<string, unknown>,
) {
  const subscribers = await findSubscribersByPipelineIds([pipelineId]);
  for (const subscriber of subscribers) {
    await deliverToSubscriber(jobId, subscriber.id, subscriber.url, result, 1);
  }
}

/** Attempts a single HTTP POST delivery and records the outcome in the deliveries table. */
async function deliverToSubscriber(
  jobId: string,
  subscriberId: string,
  url: string,
  result: Record<string, unknown>,
  attemptNumber: number,
) {
  const attemptedAt = new Date();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (response.ok) {
      await insertDelivery({
        jobId,
        subscriberId,
        attemptNumber,
        status: "success",
        httpStatus: response.status,
        attemptedAt,
      });
    } else {
      // Non-2xx response: treat as failure and schedule a retry
      await handleFailedDelivery(
        jobId,
        subscriberId,
        attemptNumber,
        attemptedAt,
        `HTTP ${response.status}`,
      );
    }
  } catch (error) {
    // Network or timeout error
    const message = error instanceof Error ? error.message : "Unknown error";
    await handleFailedDelivery(
      jobId,
      subscriberId,
      attemptNumber,
      attemptedAt,
      message,
    );
  }
}

/**
 * Records a failed delivery attempt.
 * If MAX_ATTEMPTS is reached, the delivery is marked "dead" and no further retries are scheduled.
 * Otherwise, nextRetryAt is set using the backoff schedule and the retry poller will pick it up.
 */
async function handleFailedDelivery(
  jobId: string,
  subscriberId: string,
  attemptNumber: number,
  attemptedAt: Date,
  error: string,
) {
  if (attemptNumber >= MAX_ATTEMPTS) {
    await insertDelivery({
      jobId,
      subscriberId,
      attemptNumber,
      status: "dead",
      error,
      attemptedAt,
    });
    return;
  }

  const nextRetryAt = getBackoffDelay(attemptNumber);

  await insertDelivery({
    jobId,
    subscriberId,
    attemptNumber,
    status: "failed",
    error,
    attemptedAt,
    nextRetryAt,
  });
}
