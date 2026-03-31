import { v4 as uuidv4 } from "uuid";
import {
  PipelineWithSubscribers,
  CreatePipelineBody,
  ActionType,
  ActionConfig,
  UpdatePipelineBody,
} from "../types/index.js";
import {
  deletePipelineById,
  findAllPipelines,
  findPipelineById,
  insertPipeline,
  updatePipelineById,
} from "../repositories/pipeline.repository.js";
import {
  deleteSubscriberByPipelineId,
  findSubscribersByPipelineIds,
  insertSubscribers,
} from "../repositories/subscriber.repository.js";
import { NotFoundError } from "../api/middleware/errors.js";
import { randomBytes } from "crypto";

/**
 * Creates a pipeline and its initial set of subscribers.
 * Generates a unique sourceId (used in webhook URLs) and a signing secret automatically.
 */
export async function createPipeline(
  body: CreatePipelineBody,
): Promise<PipelineWithSubscribers> {
  const pipeline = await insertPipeline({
    name: body.name,
    // sourceId is the public URL slug: POST /webhooks/:sourceId
    sourceId: uuidv4(),
    // Prefixed with "whsec_" to make secrets easy to identify (similar to Stripe's convention)
    signingSecret: `whsec_${randomBytes(32).toString("hex")}`,
    actionType: body.actionType,
    actionConfig: body.actionConfig as Record<string, unknown>,
  });

  const subscribers = await insertSubscribers(
    body.subscribers.map((url) => ({ pipelineId: pipeline.id, url })),
  );

  return {
    ...pipeline,
    actionType: pipeline.actionType as ActionType,
    actionConfig: pipeline.actionConfig as ActionConfig,
    subscribers,
  };
}

/**
 * Fetches all pipelines with their subscribers in exactly 2 queries.
 * Subscribers are fetched in bulk and grouped in-memory to avoid an N+1 query per pipeline.
 */
export async function getAllPipelines(): Promise<PipelineWithSubscribers[]> {
  const allPipelines = await findAllPipelines();

  if (allPipelines.length === 0) return [];

  const pipelineIds = allPipelines.map((p) => p.id);
  const allSubscribers = await findSubscribersByPipelineIds(pipelineIds);
  return allPipelines.map((pipeline) => ({
    ...pipeline,
    actionType: pipeline.actionType as ActionType,
    actionConfig: pipeline.actionConfig as ActionConfig,
    subscribers: allSubscribers.filter((s) => pipeline.id === s.pipelineId),
  }));
}

/** Fetches a single pipeline with its subscribers. Throws NotFoundError if not found. */
export async function getPipelineById(
  id: string,
): Promise<PipelineWithSubscribers> {
  const pipeline = await findPipelineById(id);
  if (!pipeline) throw new NotFoundError("PIPELINE_NOT_FOUND");
  const subscribers = await findSubscribersByPipelineIds([pipeline.id]);

  return {
    ...pipeline,
    actionType: pipeline.actionType as ActionType,
    actionConfig: pipeline.actionConfig as ActionConfig,
    subscribers: subscribers,
  };
}

/**
 * Partially updates a pipeline. Only provided fields are changed.
 * If subscribers are provided, the existing list is fully replaced (delete + re-insert).
 */
export async function updatePipeline(id: string, body: UpdatePipelineBody) {
  const existing = await findPipelineById(id);
  if (!existing) throw new NotFoundError("PIPELINE_NOT_FOUND");

  const updated = await updatePipelineById(id, {
    ...(body.name && { name: body.name }),
    ...(body.actionType && { actionType: body.actionType }),
    ...(body.actionConfig && {
      actionConfig: body.actionConfig as Record<string, unknown>,
    }),
    ...(body.status && { status: body.status }),
    updatedAt: new Date(),
  });

  if (!updated) throw new Error("UPDATE_FAILED");

  if (body.subscribers) {
    // Replace-all strategy: simpler than diffing, acceptable since subscriber lists are small
    await deleteSubscriberByPipelineId(id);
    await insertSubscribers(
      body.subscribers.map((url) => ({ pipelineId: id, url })),
    );
  }

  const pipelineSubscribers = await findSubscribersByPipelineIds([id]);

  return {
    ...updated,
    actionType: body.actionType as ActionType,
    actionConfig: body.actionConfig as ActionConfig,
    subscribers: pipelineSubscribers,
  };
}

/** Deletes a pipeline by ID. Returns true if deleted, false if not found. */
export async function deletePipeline(id: string): Promise<boolean> {
  return deletePipelineById(id);
}
