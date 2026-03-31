import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestWebhook } from "./webhook.service.js";
import * as pipelineRepo from "../repositories/pipeline.repository.js";
import * as jobRepo from "../repositories/job.repository.js";
import { JobStatus } from "../types/index.js";

vi.mock("../repositories/pipeline.repository");
vi.mock("../repositories/job.repository");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ingestWebhook", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
    signingSecret: "whsec_abc123",
  };
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
  it("should return a job", async () => {
    vi.spyOn(pipelineRepo, "findPipelineBySourceId").mockResolvedValue(
      mockPipeline,
    );
    vi.spyOn(jobRepo, "insertJob").mockResolvedValue(mockJob);

    const result = await ingestWebhook(mockPipeline.sourceId, mockJob.payload);

    expect(result.pipelineId).toBe(mockPipeline.id);
    expect(result.payload).toEqual(mockJob.payload);
  });
  it("should throw if pipeline is not found", async () => {
    vi.spyOn(pipelineRepo, "findPipelineBySourceId").mockResolvedValue(null);

    await expect(
      ingestWebhook("non-existent", { orderId: "123" }),
    ).rejects.toThrow("PIPELINE_NOT_FOUND");
  });

  it("should throw if pipeline is paused", async () => {
    vi.spyOn(pipelineRepo, "findPipelineBySourceId").mockResolvedValue({
      ...mockPipeline,
      status: "paused",
    });

    await expect(
      ingestWebhook(mockPipeline.sourceId, { orderId: "123" }),
    ).rejects.toThrow("PIPELINE_PAUSED");
  });
});
