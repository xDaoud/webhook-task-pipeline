import { describe, it, expect, vi, beforeEach } from "vitest";
import { deliverToSubscribers, handleFailedDelivery } from "./deliver.js";
import * as subscriberRepo from "../repositories/subscriber.repository.js";
import * as deliveryRepo from "../repositories/delivery.repository.js";

vi.mock("../repositories/subscriber.repository.js");
vi.mock("../repositories/delivery.repository.js");

const mockSubscriber = {
  id: "sub-1",
  pipelineId: "pipeline-123",
  url: "https://example.com/webhook",
  createdAt: new Date(),
};

const mockDelivery = {
  id: "delivery-123",
  jobId: "job-123",
  subscriberId: "sub-1",
  attemptNumber: 1,
  status: "success" as const,
  httpStatus: 200,
  error: null,
  attemptedAt: new Date(),
  nextRetryAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("deliverToSubscribers", () => {
  it("should insert success delivery when fetch succeeds", async () => {
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue([
      mockSubscriber,
    ]);
    vi.spyOn(deliveryRepo, "insertDelivery").mockResolvedValue(mockDelivery);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await deliverToSubscribers("job-123", "pipeline-123", { orderId: "123" });

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        httpStatus: 200,
      }),
    );
  });

  it("should insert failed delivery when fetch returns non-ok response", async () => {
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue([
      mockSubscriber,
    ]);
    vi.spyOn(deliveryRepo, "insertDelivery").mockResolvedValue(mockDelivery);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await deliverToSubscribers("job-123", "pipeline-123", { orderId: "123" });

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: "HTTP 500",
      }),
    );
  });

  it("should insert failed delivery when fetch throws network error", async () => {
    vi.spyOn(subscriberRepo, "findSubscribersByPipelineIds").mockResolvedValue([
      mockSubscriber,
    ]);
    vi.spyOn(deliveryRepo, "insertDelivery").mockResolvedValue(mockDelivery);
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await deliverToSubscribers("job-123", "pipeline-123", { orderId: "123" });

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: "Network error",
      }),
    );
  });
});

describe("handleFailedDelivery", () => {
  it("should insert dead delivery when max attempts reached", async () => {
    vi.spyOn(deliveryRepo, "insertDelivery").mockResolvedValue(mockDelivery);

    await handleFailedDelivery("job-123", "sub-1", 5, new Date(), "HTTP 500");

    expect(deliveryRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "dead",
        attemptNumber: 5,
      }),
    );
  });
});
