import { v4 as uuidv4 } from 'uuid';
import { PipelineWithSubscribers, CreatePipelineBody, ActionType, ActionConfig, UpdatePipelineBody } from '../types';
import { deletePipelineById, findAllPipelines, findPipelineById, insertPipeline, updatePipelineById } from '../repositories/pipeline.repository';
import { deleteSubscriberByPipelineId, findSubscribersByPipelineIds, insertSubscribers } from '../repositories/subscriber.repository';

export async function createPipeline(body: CreatePipelineBody): Promise<PipelineWithSubscribers> {
  const pipeline = await insertPipeline({
    name: body.name,
    sourceId: uuidv4(),
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

export async function getPipelineById(id: string): Promise<PipelineWithSubscribers | null> {
  const pipeline = await findPipelineById(id);
  if(!pipeline) return null;
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
  if(!existing) return null;

  const updated = await updatePipelineById(id, {
    ...(body.name && { name: body.name}),
    ...(body.actionType && {actionType: body.actionType}),
    ...(body.actionConfig && {actionConfig: body.actionConfig as Record<string, unknown>}),
    ...(body.status && {status: body.status}),
    updatedAt: new Date(),
  });

  if(!updated) return null;

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