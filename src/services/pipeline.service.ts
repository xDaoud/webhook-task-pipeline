import { v4 as uuidv4 } from 'uuid';
import { PipelineWithSubscribers, CreatePipelineBody, ActionType, ActionConfig, UpdatePipelineBody } from '../types/index.js';
import { deletePipelineById, findAllPipelines, findPipelineById, insertPipeline, updatePipelineById } from '../repositories/pipeline.repository.js';
import { deleteSubscriberByPipelineId, findSubscribersByPipelineIds, insertSubscribers } from '../repositories/subscriber.repository.js';
import { NotFoundError } from '../api/middleware/errors.js';
import { randomBytes } from 'crypto';

export async function createPipeline(body: CreatePipelineBody): Promise<PipelineWithSubscribers> {
  const pipeline = await insertPipeline({
    name: body.name,
    sourceId: uuidv4(),
    signingSecret: `whsec_${randomBytes(32).toString('hex')}`,
    actionType: body.actionType,
    actionConfig: body.actionConfig as Record<string, unknown>,
  });

  const subscribers = await insertSubscribers(
    body.subscribers.map((url) => ({ pipelineId: pipeline.id, url }))
  );

  return {
    ...pipeline,
    actionType: pipeline.actionType as ActionType,
    actionConfig: pipeline.actionConfig as ActionConfig,
    subscribers,
  };
}

export async function getAllPipelines(): Promise<PipelineWithSubscribers[]> {
  const allPipelines = await findAllPipelines();

  if(allPipelines.length === 0) return [];

  const pipelineIds = allPipelines.map((p) => p.id);
  const allSubscribers = await findSubscribersByPipelineIds(pipelineIds);
  return allPipelines.map((pipeline) => ({
        ...pipeline,
        actionType: pipeline.actionType as ActionType,
        actionConfig: pipeline.actionConfig as ActionConfig,
        subscribers: allSubscribers.filter((s) => pipeline.id === s.pipelineId),
    }));
}

export async function getPipelineById(id: string): Promise<PipelineWithSubscribers> {
  const pipeline = await findPipelineById(id);
  if(!pipeline) throw new NotFoundError("PIPELINE_NOT_FOUND");
  const subscribers = await findSubscribersByPipelineIds([pipeline.id]);

  return {
    ...pipeline,
    actionType: pipeline.actionType as ActionType,
    actionConfig: pipeline.actionConfig as ActionConfig,
    subscribers: subscribers,
  };
}

export async function updatePipeline(id: string, body: UpdatePipelineBody) {
  const existing = await findPipelineById(id);
  if(!existing) throw new NotFoundError("PIPELINE_NOT_FOUND");

  const updated = await updatePipelineById(id, {
    ...(body.name && { name: body.name}),
    ...(body.actionType && {actionType: body.actionType}),
    ...(body.actionConfig && {actionConfig: body.actionConfig as Record<string, unknown>}),
    ...(body.status && {status: body.status}),
    updatedAt: new Date(),
  });

  if(!updated) throw new Error("UPDATE_FAILED");

  if(body.subscribers){
    await deleteSubscriberByPipelineId(id);
    await insertSubscribers(body.subscribers.map((url) => ({pipelineId: id, url})));
  }

  const pipelineSubscribers = await findSubscribersByPipelineIds([id]);

  return{
    ...updated,
    actionType: body.actionType as ActionType,
    actionConfig: body.actionConfig as ActionConfig,
    subscribers: pipelineSubscribers,
  }
}

export async function deletePipeline(id: string): Promise<boolean> {
  return deletePipelineById(id);
}