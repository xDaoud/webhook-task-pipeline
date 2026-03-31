import { transformAction } from "./transform.js";
import { describe, expect, it } from "vitest";

describe("transform action", () => {
  it("should rename specified fields", () => {
    const payload = { name: "John" };
    const config = { rename: { name: "fullName" } };
    expect(transformAction(payload, config)).toEqual({ fullName: "John" });
  });

  it("should return same object when rename is empty", () => {
    const payload = { name: "John", age: 30, password: "secret" };
    const config = { rename: {} };
    expect(transformAction(payload, config)).toEqual(payload);
  });

  it("should return empty object when payload is empty", () => {
    const payload = {};
    const config = { rename: { name: "John" } };
    expect(transformAction(payload, config)).toEqual({});
  });

  it("should not rename fields that don't exist in payload", () => {
    const payload = { firstName: "John", version: 1 };
    const config = { rename: { name: "fullName" } };
    expect(transformAction(payload, config)).toEqual(payload);
  });
});
