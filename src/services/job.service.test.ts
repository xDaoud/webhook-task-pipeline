import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJobById } from "./job.service";
import * as jobRepo from "../repositories/job.repository";
import { JobStatus } from "../types";


vi.mock("../repositories/job.repository");

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
    }
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