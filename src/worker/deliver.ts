import { insertDelivery } from "../repositories/delivery.repository.js";
import { findSubscribersByPipelineIds } from "../repositories/subscriber.repository.js";
// exported for testing purposes
export { handleFailedDelivery }

const MAX_ATTEMPTS = 5;

export function getBackoffDelay(attemptNumber: number): Date {
  const delays = [1, 5, 30, 60, 180]; //minutes
  const minutes = delays[attemptNumber - 1] ?? 180;
  const nextRetryAt = new Date();
  nextRetryAt.setMinutes(nextRetryAt.getMinutes() + minutes);
  return nextRetryAt;
}

export async function deliverToSubscribers(
  jobId: string,
  pipelineId: string,
  result: Record<string, unknown>
) {
  const subscribers = await findSubscribersByPipelineIds([pipelineId]);
  for(const subscriber of subscribers){ 
    await deliverToSubscriber(jobId, subscriber.id, subscriber.url, result, 1);
  }
}

async function deliverToSubscriber(
  jobId: string,
  subscriberId: string,
  url: string,
  result: Record<string, unknown>,
  attemptNumber: number
) {
  const attemptedAt = new Date();

  try {
    const response = await fetch( url, {
      method: 'POST',
      headers: {'Content-Type' : 'application/json'},
      body: JSON.stringify(result),
  });

  if(response.ok) {
    await insertDelivery({
      jobId,
      subscriberId,
      attemptNumber,
      status: 'success',
      httpStatus: response.status,
      attemptedAt,
    });
  } else {
      await handleFailedDelivery(jobId, subscriberId, attemptNumber, attemptedAt, `HTTP ${response.status}`);
    }
  } catch(error){
    const message = error instanceof Error ? error.message : 'Unknown error';
    await handleFailedDelivery(jobId, subscriberId, attemptNumber, attemptedAt, message);
  }
}

async function handleFailedDelivery(
  jobId: string,
  subscriberId: string,
  attemptNumber: number,
  attemptedAt: Date,
  error: string
) {
  if(attemptNumber >= MAX_ATTEMPTS){
    await insertDelivery({
      jobId,
      subscriberId,
      attemptNumber,
      status: 'dead',
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
    status: 'failed',
    error,
    attemptedAt,
    nextRetryAt,
  })
}