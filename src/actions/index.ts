import { ActionConfig, ActionType, EnrichConfig, FilterConfig, TransformConfig } from "src/types/index.js";
import { filterAction } from "./filter.js";
import { transformAction } from "./transform.js";
import { enrichAction } from "./enrich.js";

export function runAction(
  actionType: ActionType,
  actionConfig: ActionConfig,
  payload: Record<string, unknown>
): Record<string, unknown> {
  switch(actionType){
    case 'filter':
      return filterAction(payload, actionConfig as FilterConfig);
    case 'transform':
      return transformAction(payload, actionConfig as TransformConfig);
    case 'enrich':
      return enrichAction(payload, actionConfig as EnrichConfig);
    default:
      throw new Error(`Unknown Action Type: ${actionType}`);
  }
}