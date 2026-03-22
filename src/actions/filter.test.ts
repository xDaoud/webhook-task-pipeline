import { filterAction } from "./filter.js";
import { describe, expect, it } from "vitest";

describe("filter action", () => {
  it("should keep only specifed fields", () => {
    const payload = { name: 'John', age: 30, password: 'secret' };
    const config = { keepFields: ['name', 'age'] };
    expect(filterAction(payload, config)).toEqual({name: 'John', age: 30});
  });

  it("should return empty object when keepFields is empty", () => {
    const payload = { name: 'John', age: 30, password: 'secret' };
    const config = { keepFields: [] };
    expect(filterAction(payload, config)).toEqual({});
  });

  it("should return empty object when payload is empty", () => {
    const payload = { };
    const config = { keepFields: ['name'] };
    expect(filterAction(payload, config)).toEqual({});
  });
});