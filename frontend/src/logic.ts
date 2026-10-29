/**
 * Conditional logic, mirrored from backend/app/schema.py so fields toggle live in the
 * browser. Both versions are tested against shared/conditions.json.
 */
import type { Answer, Answers, Condition, Field, FieldType, Op, Rule } from "./types";

export const isEmpty = (v: Answer): boolean =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function ruleMatches(rule: Rule, answers: Answers): boolean {
  const a = answers[rule.field];
  const v = rule.value;
  switch (rule.op) {
    case "empty":
      return isEmpty(a);
    case "not_empty":
      return !isEmpty(a);
    case "equals":
      return !isEmpty(a) && a === v;
    case "not_equals":
      return isEmpty(a) || a !== v;
    case "contains":
    case "not_contains": {
      let hit = false;
      if (Array.isArray(a)) hit = a.includes(v as string);
      else if (typeof a === "string" && typeof v === "string") hit = a.toLowerCase().includes(v.toLowerCase());
      return rule.op === "contains" ? hit : !hit;
    }
    case "gt":
    case "lt": {
      if (isEmpty(a) || v === null || v === undefined || Array.isArray(a)) return false;
      // Numbers compare numerically; ISO dates compare correctly as strings
      if (typeof a !== typeof v) return false;
      return rule.op === "gt" ? a! > v : a! < v;
    }
  }
}

export function evaluate(cond: Condition, answers: Answers): boolean {
  if ("all" in cond) return cond.all.every((c) => evaluate(c, answers));
  if ("any" in cond) return cond.any.some((c) => evaluate(c, answers));
  return ruleMatches(cond, answers);
}

/** Top-to-bottom pass. A hidden field's answer is ignored by every later condition. */
export function visibleFieldIds(fields: Pick<Field, "id" | "show_if">[], answers: Answers): string[] {
  const seen: Answers = {};
  const visible: string[] = [];
  for (const f of fields) {
    if (!f.show_if || evaluate(f.show_if, seen)) {
      visible.push(f.id);
      if (f.id in answers) seen[f.id] = answers[f.id];
    }
  }
  return visible;
}

export const OPS_FOR_TYPE: Record<FieldType, Op[]> = {
  text: ["equals", "not_equals", "contains", "not_contains", "empty", "not_empty"],
  textarea: ["contains", "not_contains", "empty", "not_empty"],
  email: ["equals", "not_equals", "contains", "not_contains", "empty", "not_empty"],
  number: ["equals", "not_equals", "gt", "lt", "empty", "not_empty"],
  dropdown: ["equals", "not_equals", "empty", "not_empty"],
  checkbox: ["contains", "not_contains", "empty", "not_empty"],
  date: ["equals", "not_equals", "gt", "lt", "empty", "not_empty"],
};

export const OP_LABELS: Record<Op, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  empty: "is empty",
  not_empty: "is answered",
  gt: "is greater than",
  lt: "is less than",
};

export const VALUELESS: Op[] = ["empty", "not_empty"];

export function referencedFields(cond: Condition | undefined): string[] {
  if (!cond) return [];
  if ("all" in cond) return cond.all.flatMap(referencedFields);
  if ("any" in cond) return cond.any.flatMap(referencedFields);
  return [cond.field];
}

/** Drop every rule that points at `fieldId`; collapse groups that end up empty. */
export function removeRefs(cond: Condition | undefined, fieldId: string): Condition | undefined {
  if (!cond) return undefined;
  if ("all" in cond || "any" in cond) {
    const key = "all" in cond ? "all" : "any";
    const kids = ("all" in cond ? cond.all : cond.any)
      .map((c) => removeRefs(c, fieldId))
      .filter((c): c is Condition => c !== undefined);
    if (kids.length === 0) return undefined;
    return key === "all" ? { all: kids } : { any: kids };
  }
  return cond.field === fieldId ? undefined : cond;
}

/** Builder-side check for the rule the server enforces: conditions only look upward. */
export function forwardRefs(fields: Field[]): Record<string, string[]> {
  const above = new Set<string>();
  const problems: Record<string, string[]> = {};
  for (const f of fields) {
    const bad = referencedFields(f.show_if).filter((id) => !above.has(id));
    if (bad.length) problems[f.id] = bad;
    above.add(f.id);
  }
  return problems;
}
