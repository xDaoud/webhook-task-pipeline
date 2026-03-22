import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPipeline, deletePipeline, getAllPipelines, getPipelineById, updatePipeline } from "./pipeline.service.js";
import * as pipelineRepo from "../repositories/pipeline.repository.js";
import * as subscriberRepo from "../repositories/subscriber.repository.js";

vi.mock("../repositories/pipeline.repository");
vi.mock("../repositories/subscriber.repository");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createPipeline", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockSubscribers = [
    {
      id: "sub-1",
      pipelineId: "pipeline-123",
      url: "https://example.com/webhook",
      createdAt: new Date(),
    },
  ];
  it("should return a pipeline with subscribers", async () => {
    vi.spyOn(pipelineRepo, "insertPipeline").mockResolvedValue(mockPipeline);
    vi.spyOn(subscriberRepo, "insertSubscribers").mockResolvedValue(
      mockSubscribers,
    );

    const result = await createPipeline({
      name: "Test Pipeline",
      actionType: "filter",
      actionConfig: { keepFields: ["name"] },
      subscribers: ["https://example.com/webhook"],
    });

    expect(result.name).toBe("Test Pipeline");
    expect(result.subscribers).toHaveLength(1);
    expect(result.subscribers[0].url).toBe("https://example.com/webhook");
  });

  it("should generate a sourceId automatically", async () => {
    vi.spyOn(pipelineRepo, "insertPipeline").mockResolvedValue(mockPipeline);
    vi.spyOn(subscriberRepo, "insertSubscribers").mockResolvedValue(
      mockSubscribers,
    );

    await createPipeline({
      name: "Test Pipeline",
      actionType: "filter",
      actionConfig: { keepFields: ["name"] },
      subscribers: ["https://example.com/webhook"],
    });

    const insertCall = vi.mocked(pipelineRepo.insertPipeline).mock.calls[0][0];
    expect(insertCall.sourceId).toBeDefined();
    expect(typeof insertCall.sourceId).toBe("string");
  });

  it("should throw if insertPipeline fails", async () => {
    vi.spyOn(pipelineRepo, "insertPipeline").mockRejectedValue(
      new Error("DB error"),
    );

    await expect(
      createPipeline({
        name: "Test Pipeline",
        actionType: "filter",
        actionConfig: { keepFields: ["name"] },
        subscribers: ["https://example.com/webhook"],
      }),
    ).rejects.toThrow("DB error");
  });

  it("should throw if insertSubscribers fails", async () => {
    vi.spyOn(pipelineRepo, "insertPipeline").mockResolvedValue(mockPipeline);
    vi.spyOn(subscriberRepo, "insertSubscribers").mockRejectedValue(
      new Error("DB error"),
    );

    await expect(
      createPipeline({
        name: "Test Pipeline",
        actionType: "filter",
        actionConfig: { keepFields: ["name"] },
        subscribers: ["https://example.com/webhook"],
      }),
    ).rejects.toThrow("DB error");
  });
});

describe("getAllPipelines", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const secMockPipeline = {
    id: "pipeline-223",
    name: "Test Pipeline2",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockSubscribers = [
    {
      id: "sub-1",
      pipelineId: "pipeline-123",
      url: "https://example.com/webhook",
      createdAt: new Date(),
    },
    {
      id: "sub-2",
      pipelineId: "pipeline-223",
      url: "https://example.com/webhook",
      createdAt: new Date(),
    },
  ];
  it("should return an array with all pipelines with subscribers", async () => {
    vi.spyOn(pipelineRepo, "findAllPipelines").mockResolvedValue([
      mockPipeline,
      secMockPipeline,
    ]);
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue(
      mockSubscribers,
    );
    const result = await getAllPipelines();
    expect(result).toHaveLength(2);
    expect(result[0].subscribers).toHaveLength(1);
    expect(result[1].subscribers).toHaveLength(1);
  });

  it("should return an empty array when there is no pipelines", async () => {
    vi.spyOn(pipelineRepo, "findAllPipelines").mockResolvedValue([]);
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue(
      [],
    );
    const result = await getAllPipelines();
    expect(result).toEqual([]);
  });
});

describe("getPipelineById", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  
  const mockSubscribers = [
    {
      id: "sub-1",
      pipelineId: "pipeline-123",
      url: "https://example.com/webhook",
      createdAt: new Date(),
    },
  ];
  it("should return a pipeline with subscribers", async () => {
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(mockPipeline);
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue(mockSubscribers);
    const result = await getPipelineById("pipeline-123");
    expect(result?.name).toBe("Test Pipeline");
    expect(result?.subscribers).toHaveLength(1);
    expect(result?.subscribers[0].url).toBe("https://example.com/webhook");
  });

  it("should return null if the pipeline is not found", async () => {
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(null);

    const result = await getPipelineById("non-existent-id");
    expect(result).toBeNull();
  });
});

describe("updatePipeline", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInsertSubscribers = [
    {
      id: "sub-2",
      pipelineId: "pipeline-123",
      url: "https://example.com/newSub",
      createdAt: new Date(),
    },
  ];

  const mockUpdatePipeline = {
    id: "pipeline-123",
    name: "new name", //updated
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should return an updated pipeline with subscribers and update the subscribers", async () => {
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(mockPipeline);
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue(mockInsertSubscribers);
    vi.spyOn(pipelineRepo, "updatePipelineById").mockResolvedValue(mockUpdatePipeline);
    vi.spyOn(subscriberRepo, "deleteSubscriberByPipelineId").mockResolvedValue(undefined);
    vi.spyOn(subscriberRepo, "insertSubscribers").mockResolvedValue(mockInsertSubscribers);
    const result = await updatePipeline("pipeline-123", {
      name: mockUpdatePipeline.name,
      subscribers: [mockInsertSubscribers[0].url],
    });
    expect(result?.name).toBe("new name");
    expect(result?.subscribers).toHaveLength(1);
    expect(result?.subscribers[0].url).toBe("https://example.com/newSub");
  });

  it("should return null if pipeline does not exist", async () => {
  vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(null);

  const result = await updatePipeline("non-existent-id", { name: "new name" });

  expect(result).toBeNull();
});

  it("should return null if update fails", async () => {
    vi.spyOn(pipelineRepo, "findPipelineById").mockResolvedValue(mockPipeline);
    vi.spyOn(pipelineRepo, "updatePipelineById").mockResolvedValue(null);

    const result = await updatePipeline("pipeline-123", { name: "new name" });

    expect(result).toBeNull();
  });
});

describe("deletePipeline", () => {
  const mockPipeline = {
    id: "pipeline-123",
    name: "Test Pipeline",
    sourceId: "some-uuid",
    actionType: "filter",
    actionConfig: { keepFields: ["name"] },
    status: "active" as "active" | "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should return false if pipeline does not exist", async () => {
  vi.spyOn(pipelineRepo, "deletePipelineById").mockResolvedValue(false);

  const result = await deletePipeline("non-existent");

  expect(result).toBe(false);
  });

  it("should return true if pipeline does exist", async () => {
  vi.spyOn(pipelineRepo, "deletePipelineById").mockResolvedValue(true);

  const result = await deletePipeline(mockPipeline.id);

  expect(result).toBe(true);
  });
});