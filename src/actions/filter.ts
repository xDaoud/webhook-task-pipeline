import { FilterConfig } from "src/types/index.js";

export function filterAction(
  payload: Record<string, unknown>,
  config: FilterConfig,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => config.keepFields.includes(key)),
  );
}
