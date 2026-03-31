import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobStatus } from "../types";
import { processNextJob } from "./processor.js";
import * as pipelineRepo from "../repositories/pipeline.repository.js";
import * as jobRepo from "../repositories/job.repository.js";
import * as actions from "../actions/index.js";
import * as deliver from "./deliver.js";

vi.mock("../repositories/job.repository.js");
vi.mock("../repositories/pipeline.repository.js");
vi.mock("../repositories/subscriber.repository.js");
vi.mock("../actions/index.js");
vi.mock("./deliver.js");

const mockJob = {
  id: "job-123",
  pipelineId: "pipeline-123",
  payload: { orderId: "ORD-456", total: 99.9 },
  result: null,
  status: "pending" as JobStatus,
  attemptCount: 0,
  maxAttempts: 5,
  error: null,
  createdAt: new Date(),
  processedAt: null,
};

const mockPipeline = {
  id: "pipeline-123",
  name: "Test Pipeline",
  sourceId: "some-uuid",
  actionType: "filter",
  actionConfig: { keepFields: ["orderId"] },
  status: "active" as "active" | "paused",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("processNextJob", () => {
  it("should return true when job processed and delivered successfully", async () => {
    vi.spyOn(jobRepo, "claimNextJob").mockResolvedValue(mockJob);
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(mockPipeline);
    vi.spyOn(jobRepo, "markJobCompleted").mockResolvedValue(undefined);
    vi.spyOn(deliver, "deliverToSubscribers").mockResolvedValue(undefined);
    vi.spyOn(actions, "runAction").mockReturnValue({ orderId: "ORD-456" });

    const result = await processNextJob();
    expect(result).toBe(true);
    expect(pipelineRepo.findPipelineById).toHaveBeenCalledWith(
      mockJob.pipelineId,
    );
    expect(actions.runAction).toHaveReturned();
    expect(jobRepo.markJobCompleted).toHaveBeenCalledWith("job-123", {
      orderId: "ORD-456",
    });
    expect(deliver.deliverToSubscribers).toHaveBeenCalledWith(
      "job-123",
      "pipeline-123",
      { orderId: "ORD-456" },
    );
  });

  it("should return false if no pending job", async () => {
    vi.spyOn(jobRepo, "claimNextJob").mockResolvedValue(null);

    const result = await processNextJob();
    expect(result).toBe(false);
  });

  it("should return true and mark the job as failed if pipeline is not found", async () => {
    vi.spyOn(jobRepo, "claimNextJob").mockResolvedValue(mockJob);
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(null);
    vi.spyOn(jobRepo, "markJobFailed").mockResolvedValue(undefined);

    const result = await processNextJob();
    expect(result).toBe(true);
    expect(pipelineRepo.findPipelineById).toHaveBeenCalledWith(
      mockJob.pipelineId,
    );
    expect(jobRepo.markJobFailed).toHaveBeenCalledWith(
      "job-123",
      "Pipeline not found",
    );
  });

  it("should return true and mark the job as failed if action throws", async () => {
    vi.spyOn(jobRepo, "claimNextJob").mockResolvedValue(mockJob);
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(mockPipeline);
    vi.spyOn(jobRepo, "markJobFailed").mockResolvedValue(undefined);
    vi.spyOn(actions, "runAction").mockImplementation(() => {
      throw new Error("Unknown error");
    });

    const result = await processNextJob();
    expect(result).toBe(true);
    expect(pipelineRepo.findPipelineById).toHaveBeenCalledWith(
      mockJob.pipelineId,
    );
    expect(jobRepo.markJobFailed).toHaveBeenCalledWith(
      "job-123",
      "Unknown error",
    );
  });
});
