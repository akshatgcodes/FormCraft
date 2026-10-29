import type { Field, FieldType } from "../../types";

export const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "text", label: "Short text", icon: "Aa" },
  { type: "textarea", label: "Paragraph", icon: "¶" },
  { type: "email", label: "Email", icon: "@" },
  { type: "number", label: "Number", icon: "#" },
  { type: "dropdown", label: "Dropdown", icon: "▾" },
  { type: "checkbox", label: "Checkboxes", icon: "☑" },
  { type: "date", label: "Date", icon: "📅" },
];

export const typeLabel = (t: FieldType) => FIELD_TYPES.find((f) => f.type === t)!.label;

export function newField(type: FieldType, existing: Field[]): Field {
  const ids = new Set(existing.map((f) => f.id));
  let n = 1;
  while (ids.has(`${type}_${n}`)) n++;
  const field: Field = { id: `${type}_${n}`, type, label: "Untitled question" };
  if (type === "dropdown" || type === "checkbox") field.options = ["Option 1", "Option 2"];
  return field;
}
