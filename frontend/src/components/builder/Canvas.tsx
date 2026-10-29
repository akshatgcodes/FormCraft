import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Condition, Field } from "../../types";
import { OP_LABELS } from "../../logic";
import { typeLabel } from "./fieldTypes";

type Props = {
  fields: Field[];
  /** True while a palette item is being dragged */
  acceptingNew: boolean;
  selectedId: string | null;
  problems: Record<string, string[]>;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

/** One-line, human summary of a condition: "Are you a student? is Yes". */
export function describe(cond: Condition, fields: Field[]): string {
  if ("all" in cond) return cond.all.map((c) => describe(c, fields)).join(" and ");
  if ("any" in cond) return `(${cond.any.map((c) => describe(c, fields)).join(" or ")})`;
  const label = fields.find((f) => f.id === cond.field)?.label ?? cond.field;
  const value = cond.value === undefined || cond.value === null ? "" : ` ${cond.value}`;
  return `"${label}" ${OP_LABELS[cond.op]}${value}`;
}

function FieldCard({ field, fields, selected, problems, onSelect, onDuplicate, onDelete }: {
  field: Field;
  fields: Field[];
  selected: boolean;
  problems: string[];
} & Pick<Props, "onSelect" | "onDuplicate" | "onDelete">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`field-card ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""} ${problems.length ? "has-problem" : ""}`}
      onClick={() => onSelect(field.id)}
    >
      <button className="handle" {...listeners} {...attributes} aria-label={`Reorder ${field.label}`}>
        ⠿
      </button>
      <div className="field-card-main">
        <div className="field-card-title">
          {field.label}
          {field.required && <span className="req"> *</span>}
        </div>
        <div className="field-card-meta">
          <span className="badge">{typeLabel(field.type)}</span>
          <code className="muted">{field.id}</code>
        </div>
        {field.show_if && <div className="condition-chip">↳ Shown if {describe(field.show_if, fields)}</div>}
        {problems.map((p) => (
          <div key={p} className="error small">
            ⚠ {p}
          </div>
        ))}
      </div>
      <div className="field-card-actions">
        <button className="icon-btn" onClick={(e) => (e.stopPropagation(), onDuplicate(field.id))} aria-label="Duplicate">
          ⧉
        </button>
        <button className="icon-btn" onClick={(e) => (e.stopPropagation(), onDelete(field.id))} aria-label="Delete">
          ✕
        </button>
      </div>
    </li>
  );
}

export default function Canvas({ fields, acceptingNew, selectedId, problems, ...handlers }: Props) {
  // Lets palette items drop onto an empty form or below the last field. Disabled while
  // reordering, otherwise keyboard sorting can pick the whole canvas as its target.
  const { setNodeRef, isOver } = useDroppable({ id: "canvas", disabled: !acceptingNew });

  return (
    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className={`canvas ${isOver ? "over" : ""}`}>
        {fields.map((f) => (
          <FieldCard
            key={f.id}
            field={f}
            fields={fields}
            selected={f.id === selectedId}
            problems={problems[f.id] ?? []}
            {...handlers}
          />
        ))}
        {fields.length === 0 && <li className="canvas-empty">Drag a field here to start</li>}
      </ul>
    </SortableContext>
  );
}
