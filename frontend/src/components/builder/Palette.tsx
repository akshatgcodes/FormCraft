import { useDraggable } from "@dnd-kit/core";
import type { FieldType } from "../../types";
import { FIELD_TYPES } from "./fieldTypes";

function PaletteItem({ type, label, icon, onAdd }: { type: FieldType; label: string; icon: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `new:${type}` });
  return (
    <button
      ref={setNodeRef}
      className={`palette-item ${isDragging ? "dragging" : ""}`}
      // Click adds to the end; drag drops at a position. Both work with the keyboard.
      onClick={onAdd}
      {...listeners}
      {...attributes}
      aria-label={`Add ${label}`}
    >
      <span className="palette-icon" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function Palette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <aside className="palette">
      <div className="label">Fields</div>
      <p className="muted small hide-mobile">Drag onto the form, or click to add at the end.</p>
      <div className="palette-items">
        {FIELD_TYPES.map((t) => (
          <PaletteItem key={t.type} {...t} onAdd={() => onAdd(t.type)} />
        ))}
      </div>
    </aside>
  );
}
