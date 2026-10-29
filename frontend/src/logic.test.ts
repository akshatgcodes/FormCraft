import { describe, expect, it } from "vitest";
import cases from "../../shared/conditions.json";
import { evaluate, forwardRefs, removeRefs, visibleFieldIds } from "./logic";
import type { Condition, Field } from "./types";

// Same cases as backend/tests/test_shared_cases.py
describe("shared rule cases", () => {
  for (const c of cases.rules) {
    it(c.name, () => expect(evaluate(c.cond as Condition, c.answers)).toBe(c.expected));
  }
});

describe("shared visibility cases", () => {
  for (const c of cases.visibility) {
    it(c.name, () => expect(visibleFieldIds(c.fields as Field[], c.answers)).toEqual(c.expected));
  }
});

describe("builder helpers", () => {
  const rule = (field: string): Condition => ({ field, op: "not_empty" });

  it("removeRefs collapses empty groups", () => {
    expect(removeRefs({ all: [rule("a")] }, "a")).toBeUndefined();
    expect(removeRefs({ any: [rule("a"), rule("b")] }, "a")).toEqual({ any: [rule("b")] });
  });

  it("forwardRefs flags conditions that look downward", () => {
    const fields: Field[] = [
      { id: "b", type: "text", label: "B", show_if: rule("a") },
      { id: "a", type: "text", label: "A" },
    ];
    expect(forwardRefs(fields)).toEqual({ b: ["a"] });
  });
});
