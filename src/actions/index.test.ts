import { runAction } from "./index.js";
import { ActionType } from "../types/index.js"
import { describe, expect, it } from "vitest";

describe("run action", () => {
  it("if actionType is 'filter' it should run and return", () => {
    const payload = { name: 'John', age: 30, password: 'secret' };
    const config = { keepFields: ['name', 'age'] };
    expect(runAction('filter', config, payload)).toEqual({name: 'John', age: 30});
  });

  it("if actionType is 'transform' it should run and return", () => {
      const payload = { name: 'John' };
      const config = { rename: { name: 'fullName' } };
      expect(runAction('transform', config, payload)).toEqual({ fullName: 'John' });
  });

  it("if actionType is 'enrich' it should run and return", () => {
      const payload = { name: 'John' };
      const config = { addFields: { source: 'webhook', version: 2 } };
      expect(runAction('enrich', config, payload)).toEqual({ name: 'John', source: 'webhook', version: 2 });
  });

  it("if actionType is otherwise, it should throw", () => {
    expect(() => runAction('non-existent' as ActionType, {config: "config"}, {payload: "payload"}))
    .toThrow("Unknown Action Type: non-existent");
  })
});