import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as subscriberRepo from '../repositories/subscriber.repository.js';
import * as deliveryRepo from '../repositories/delivery.repository.js';
import * as jobRepo from '../repositories/job.repository.js';
import { DeliveryStatus, JobStatus } from '../types/index.js';
import { processFailedDeliveries } from './retry.js';

vi.mock('../repositories/subscriber.repository.js');
vi.mock('../repositories/delivery.repository.js');
vi.mock('../repositories/job.repository.js')

const mockSubscriber = {
  id: 'sub-1',
  pipelineId: 'pipeline-123',
  url: 'https://example.com/webhook',
  createdAt: new Date(),
};

const mockDelivery = {
  id: 'delivery-123',
  jobId: 'job-123',
  subscriberId: 'sub-1',
  attemptNumber: 1,
  status: 'failed' as DeliveryStatus,
  httpStatus: 200,
  error: null,
  attemptedAt: new Date(),
  nextRetryAt: null,
};

const mockJob = {
    id: 'job-123',
    pipelineId: 'pipeline-123',
    payload: { orderId: 'ORD-456', total: 99.9 },
    result: { orderId: 'ORD-456' },
    status: 'completed' as JobStatus,
    attemptCount: 0,
    maxAttempts: 5,
    error: null,
    createdAt: new Date(),
    processedAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('processFailedDeliveries', () => {
  it('should insert success delivery when failed delivery retry successfully', async () => {
    vi.spyOn(jobRepo, 'findJobById').mockResolvedValue(mockJob);
    vi.spyOn(subscriberRepo, 'findSubscribersByIds').mockResolvedValue([mockSubscriber]);
    vi.spyOn(deliveryRepo, 'insertDelivery').mockResolvedValue(mockDelivery);
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([mockDelivery]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await processFailedDeliveries();

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        httpStatus: 200,
      })
    );
  });

  it('should retry failed delivery when fetch returns non-ok response and set nextRetryAt', async () => {
    vi.spyOn(jobRepo, 'findJobById').mockResolvedValue(mockJob);
    vi.spyOn(subscriberRepo, 'findSubscribersByIds').mockResolvedValue([mockSubscriber]);
    vi.spyOn(deliveryRepo, 'insertDelivery').mockResolvedValue(mockDelivery);
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([mockDelivery]);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await processFailedDeliveries();

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'HTTP 500',
        nextRetryAt: expect.any(Date),
      })
    );
  });

  it('should retry failed delivery when fetch throws network error and set nextRetryAt', async () => {
    vi.spyOn(jobRepo, 'findJobById').mockResolvedValue(mockJob);
    vi.spyOn(subscriberRepo, 'findSubscribersByIds').mockResolvedValue([mockSubscriber]);
    vi.spyOn(deliveryRepo, 'insertDelivery').mockResolvedValue(mockDelivery);
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([mockDelivery]);
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await processFailedDeliveries();

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'Network error',
        nextRetryAt: expect.any(Date),
      })
    );
  });

  it('should do nothing if no deliveries are due to retry', async () => {
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([]);

    await processFailedDeliveries();
    expect(deliveryRepo.insertDelivery).not.toHaveBeenCalled();
  });

  it('should return early if job is not found, no delivery inserted', async() => {
    vi.spyOn(jobRepo, 'findJobById').mockResolvedValue(null);
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([mockDelivery]);

    await processFailedDeliveries();
    expect(deliveryRepo.insertDelivery).not.toHaveBeenCalled();
  });

  it('should return early if subscriber is not found, no delivery inserted', async() => {
    vi.spyOn(jobRepo, 'findJobById').mockResolvedValue(mockJob);
    vi.spyOn(deliveryRepo, 'findDeliveriesDueForRetry').mockResolvedValue([mockDelivery]);
    vi.spyOn(subscriberRepo, 'findSubscribersByIds').mockResolvedValue([]);

    await processFailedDeliveries();
    expect(deliveryRepo.insertDelivery).not.toHaveBeenCalled();
  });
});
