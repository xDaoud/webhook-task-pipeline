import { EnrichConfig } from "src/types/index.js";

/**
 * Merges `config.addFields` into the payload.
 * If a key exists in both, the value from `addFields` wins.
 */
export function enrichAction(
  payload: Record<string, unknown>,
  config: EnrichConfig,
): Record<string, unknown> {
  return {
    ...payload,
    ...config.addFields,
  };
}
