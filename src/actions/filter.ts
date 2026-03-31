import { FilterConfig } from "src/types/index.js";

/**
 * Returns a new object containing only the fields listed in `config.keepFields`.
 * All other keys are dropped. Field order is not guaranteed.
 */
export function filterAction(
  payload: Record<string, unknown>,
  config: FilterConfig,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => config.keepFields.includes(key)),
  );
}
