import { enrichAction } from "./enrich.js";
import { describe, expect, it } from "vitest";

describe("enrich action", () => {
  it("should add included fields", () => {
    const payload = { name: "John" };
    const config = { addFields: { source: "webhook", version: 2 } };
    expect(enrichAction(payload, config)).toEqual({
      name: "John",
      source: "webhook",
      version: 2,
    });
  });

  it("should return same object when addFields is empty", () => {
    const payload = { name: "John", age: 30, password: "secret" };
    const config = { addFields: {} };
    expect(enrichAction(payload, config)).toEqual(payload);
  });

  it("should return included fields when payload is empty", () => {
    const payload = {};
    const config = { addFields: { name: "John" } };
    expect(enrichAction(payload, config)).toEqual(config.addFields);
  });

  it("should overwrite existing fields when addFields has the same key", () => {
    const payload = { name: "John", version: 1 };
    const config = { addFields: { version: 2 } };
    expect(enrichAction(payload, config)).toEqual({ name: "John", version: 2 });
  });
});
