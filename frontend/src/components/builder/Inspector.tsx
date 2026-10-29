import type { Field, Validation } from "../../types";
import ConditionEditor from "./ConditionEditor";
import { typeLabel } from "./fieldTypes";

type Props = {
  field: Field;
  earlier: Field[];
  /** Ids of later fields whose conditions point at this one */
  dependents: Field[];
  onChange: (field: Field) => void;
};

const num = (s: string) => (s === "" ? undefined : Number(s));

export default function Inspector({ field, earlier, dependents, onChange }: Props) {
  const set = <K extends keyof Field>(key: K, value: Field[K]) => onChange({ ...field, [key]: value });
  const v = field.validation ?? {};
  const setV = (patch: Validation) => {
    const next = Object.fromEntries(Object.entries({ ...v, ...patch }).filter(([, x]) => x !== undefined && x !== ""));
    set("validation", Object.keys(next).length ? next : undefined);
  };
  const isText = ["text", "textarea", "email"].includes(field.type);
  const isChoice = field.type === "dropdown" || field.type === "checkbox";

  return (
    <div className="inspector">
      <div className="label">{typeLabel(field.type)}</div>

      <label className="prop">
        <span>Question</span>
        <input value={field.label} onChange={(e) => set("label", e.target.value)} maxLength={300} />
      </label>
      <label className="prop">
        <span>Help text</span>
        <input value={field.help ?? ""} onChange={(e) => set("help", e.target.value || undefined)} />
      </label>
      {(isText || field.type === "number") && (
        <label className="prop">
          <span>Placeholder</span>
          <input value={field.placeholder ?? ""} onChange={(e) => set("placeholder", e.target.value || undefined)} />
        </label>
      )}
      <label className="prop-check">
        <input type="checkbox" checked={!!field.required} onChange={(e) => set("required", e.target.checked || undefined)} />
        Required
      </label>

      {isChoice && (
        <fieldset className="prop-group">
          <legend>Options</legend>
          {(field.options ?? []).map((o, i) => (
            <div key={i} className="row">
              <input
                value={o}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => set("options", field.options!.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                className="icon-btn"
                onClick={() => set("options", field.options!.filter((_, j) => j !== i))}
                disabled={field.options!.length <= 1}
                aria-label={`Remove option ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={() => set("options", [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`])}>
            + Add option
          </button>
        </fieldset>
      )}

      {isText && (
        <fieldset className="prop-group">
          <legend>Validation</legend>
          <div className="row">
            <label className="prop">
              <span>Min length</span>
              <input type="number" min={0} value={v.min_length ?? ""} onChange={(e) => setV({ min_length: num(e.target.value) })} />
            </label>
            <label className="prop">
              <span>Max length</span>
              <input type="number" min={1} value={v.max_length ?? ""} onChange={(e) => setV({ max_length: num(e.target.value) })} />
            </label>
          </div>
          {field.type === "text" && (
            <label className="prop">
              <span>Pattern (regex, whole answer)</span>
              <input className="mono" value={v.pattern ?? ""} placeholder="e.g. RA\d{13}" onChange={(e) => setV({ pattern: e.target.value })} />
            </label>
          )}
        </fieldset>
      )}

      {(field.type === "number" || field.type === "date") && (
        <fieldset className="prop-group">
          <legend>Validation</legend>
          <div className="row">
            {(["min", "max"] as const).map((k) => (
              <label className="prop" key={k}>
                <span>{k === "min" ? "Minimum" : "Maximum"}</span>
                <input
                  type={field.type}
                  value={v[k] ?? ""}
                  onChange={(e) => setV({ [k]: field.type === "number" ? num(e.target.value) : e.target.value })}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="prop-group">
        <legend>Show this field</legend>
        <ConditionEditor value={field.show_if} earlier={earlier} onChange={(c) => set("show_if", c)} />
      </fieldset>

      {dependents.length > 0 && (
        <p className="muted small">
          Controls: {dependents.map((d) => d.label).join(", ")}
        </p>
      )}
    </div>
  );
}
