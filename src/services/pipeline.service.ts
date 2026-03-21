import { v4 as uuidv4 } from 'uuid';
import { PipelineWithSubscribers, CreatePipelineBody, ActionType, ActionConfig } from '../types';
import { insertPipeline } from '../repositories/pipeline.repository';
import { insertSubscribers } from '../repositories/subscriber.repository';

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