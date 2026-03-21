import { v4 as uuidv4 } from 'uuid';
import { PipelineWithSubscribers, CreatePipelineBody, ActionType, ActionConfig } from '../types';
import { findAllPipelines, insertPipeline } from '../repositories/pipeline.repository';
import { findSubscribersByPipelineId, insertSubscribers } from '../repositories/subscriber.repository';

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
  const pipelinesWithSubscribers = await Promise.all(
    allPipelines.map(async (pipeline) => {
      const pipelineSubscribers = await findSubscribersByPipelineId(pipeline.id);
      return {
        ...pipeline,
        actionType: pipeline.actionType as ActionType,
        actionConfig: pipeline.actionConfig as ActionConfig,
        subscribers: pipelineSubscribers,
      };
    })
  );
  return pipelinesWithSubscribers;
}