import { TransformConfig } from "src/types/index.js";

/**
 * Renames top-level payload keys according to `config.rename` ({ oldKey: newKey }).
 * Keys not listed in the rename map are passed through unchanged.
 * Keys listed in the map but absent from the payload are silently ignored.
 */
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
