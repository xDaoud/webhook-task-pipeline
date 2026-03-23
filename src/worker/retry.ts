import { findDeliveriesDueForRetry, insertDelivery } from "../repositories/delivery.repository.js";
import { findJobById } from "../repositories/job.repository.js";
import { findSubscribersByIds } from "../repositories/subscriber.repository.js";
import { getBackoffDelay } from "./deliver.js";


const MAX_ATTEMPTS = 5;

export async function processFailedDeliveries() {
  const dueDeliveries = await findDeliveriesDueForRetry();

  for(const delivery of dueDeliveries) {
    retryDelivery(delivery);
  }
}

async function retryDelivery(delivery: {
  id: string;
  jobId: string;
  subscriberId: string;
  attemptNumber: number;
}) {
  const job = await findJobById(delivery.jobId);
  if(!job) return;

  const subscriber = await findSubscribersByIds([delivery.subscriberId]);
  if(!subscriber) return;

  const result = job.result as Record<string, unknown>;
  if(!result) return;

  const nextAttemptNumber = delivery.attemptNumber + 1;
  const attemptedAt = new Date();

  try{
    const response = await fetch(subscriber[0].url, {
      method: 'POST',
      headers: { 'Content-Type' : 'application/json' },
      body: JSON.stringify(result),
    })

    if(response.ok){
      await insertDelivery({
        jobId: delivery.jobId,
        subscriberId: delivery.subscriberId,
        attemptNumber: delivery.attemptNumber,
        status: 'success',
        httpStatus: response.status,
        attemptedAt,
      });
    } else {
      await handleRetryFailure(delivery, nextAttemptNumber, attemptedAt, `HTTP ${response.status}`);
    }
  } catch(error){
    const message = error instanceof Error ? error.message : 'Unknown error';
    await handleRetryFailure(delivery, nextAttemptNumber, attemptedAt, message);
  }
}

async function handleRetryFailure(
  delivery: { jobId: string; subscriberId: string},
  attemptNumber: number,
  attemptedAt: Date,
  error: string
) {
  if(attemptNumber >= MAX_ATTEMPTS) {
    await insertDelivery({
      jobId: delivery.jobId,
      subscriberId: delivery.subscriberId,
      attemptNumber,
      status: 'dead',
      error,
      attemptedAt,
    });
    return;
  }
  await insertDelivery({
      jobId: delivery.jobId,
      subscriberId: delivery.subscriberId,
      attemptNumber,
      status: 'failed',
      error,
      attemptedAt,
      nextRetryAt: getBackoffDelay(attemptNumber),
    });
}