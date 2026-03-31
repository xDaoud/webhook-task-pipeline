import { TransformConfig } from "src/types/index.js";

export function transformAction(
  payload: Record<string, unknown>,
  config: TransformConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...payload };
  for (const [oldKey, newKey] of Object.entries(config.rename)) {
    if (oldKey in result) {
      result[newKey] = result[oldKey];
      delete result[oldKey];
    }
  }
  return result;
}
