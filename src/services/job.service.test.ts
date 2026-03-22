import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJobById, getJobDeliveries } from "./job.service.js";
import * as jobRepo from "../repositories/job.repository.js";
import * as deliveryRepo from "../repositories/delivery.repository.js";
import { Delivery, JobStatus } from "../types/index.js";


vi.mock("../repositories/job.repository");
vi.mock("../repositories/delivery.repository");

beforeEach(() => {
  vi.resetAllMocks();
});



describe("getJobById", () => {
  const mockJob = {
      id: "job-123",
      pipelineId: "pipeline-123",
      payload: { orderId: 'ORD-456', total: 99.9 },
      result: null,
      status: 'pending' as JobStatus,
      attemptCount: 0,
      maxAttempts: 5,
      error: null,
      createdAt: new Date(),
      processedAt: null,
    };
  it("should return a job", async () => {
    vi.spyOn(jobRepo, "findJobById").mockResolvedValue(mockJob);
    
    const result = await getJobById("job-123");
    expect(result?.id).toBe(mockJob.id);
    expect(result?.payload).toEqual(mockJob.payload);
  });

  it("should return null if the job is not found", async () => {
    vi.spyOn(jobRepo, "findJobById").mockResolvedValue(null);

    const result = await getJobById("non-existent-id");
    expect(result).toBeNull();
  });
});

describe("getJobDeliveries", () => {
  const mockJob = {
      id: "job-123",
      pipelineId: "pipeline-123",
      payload: { orderId: 'ORD-456', total: 99.9 },
      result: null,
      status: 'pending' as JobStatus,
      attemptCount: 0,
      maxAttempts: 5,
      error: null,
      createdAt: new Date(),
      processedAt: null,
    };
    const mockDelivery = {
      id: "delivery-123",
      jobId: "job-123",
      subscriberId: "subscriber-123",
      attemptNumber: 1,
      status: 'pending' as Delivery['status'],
      httpStatus: 200,
      error: 'no error',
      attemptedAt: new Date(),
      nextRetryAt: null,
    };
    it("should return job deliveries", async() => {
      vi.spyOn(jobRepo, "findJobById").mockResolvedValue(mockJob);
      vi.spyOn(deliveryRepo, "findDeliveriesByJobId").mockResolvedValue([mockDelivery]);
      const result = await getJobDeliveries(mockJob.id);
      expect(result).toHaveLength(1);
    });

    it("should return empty array if no deliveries", async() => {
      vi.spyOn(jobRepo, "findJobById").mockResolvedValue(mockJob);
      vi.spyOn(deliveryRepo, "findDeliveriesByJobId").mockResolvedValue([]);
      const result = await getJobDeliveries(mockJob.id);
      expect(result).toEqual([]);
    });

    it("should throw if job is not found", async() => {
      vi.spyOn(jobRepo, "findJobById").mockResolvedValue(null);

      await expect(
        getJobDeliveries("non-existent")
      ).rejects.toThrow("JOB_NOT_FOUND");
    });
});