import { EnrichConfig } from "src/types/index.js";

export function enrichAction(
  payload: Record<string, unknown>,
  config: EnrichConfig,
): Record<string, unknown> {
  return {
    ...payload,
    ...config.addFields,
  }
}