import type { Answer, Field } from "../types";

type Props = {
  field: Field;
  value: Answer;
  error?: string;
  onChange: (value: Answer) => void;
};

/** Renders one field for a respondent. Shared by the public form and the builder preview. */
export default function FieldInput({ field, value, error, onChange }: Props) {
  const id = `f-${field.id}`;
  const v = field.validation ?? {};
  const describedBy = [field.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": !!error, "aria-describedby": describedBy };

  let input;
  switch (field.type) {
    case "textarea":
      input = (
        <textarea
          {...common}
          rows={4}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          maxLength={v.max_length}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "number":
      input = (
        <input
          {...common}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          min={v.min as number | undefined}
          max={v.max as number | undefined}
          step="any"
          // Send a real number (or nothing), never the raw string
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
      break;
    case "dropdown":
      input = (
        <select {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case "checkbox": {
      const selected = (value as string[]) ?? [];
      input = (
        <div className="choices" role="group" aria-labelledby={`${id}-label`}>
          {field.options?.map((o) => (
            <label key={o} className="choice">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, o] : selected.filter((s) => s !== o))
                }
              />
              {o}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "date":
      input = (
        <input
          {...common}
          type="date"
          value={(value as string) ?? ""}
          min={v.min as string | undefined}
          max={v.max as string | undefined}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
      break;
    default:
      input = (
        <input
          {...common}
          type={field.type === "email" ? "email" : "text"}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          maxLength={v.max_length}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      {field.type === "checkbox" ? (
        <span className="field-label" id={`${id}-label`}>
          {field.label} {field.required && <span className="req">*</span>}
        </span>
      ) : (
        <label className="field-label" htmlFor={id}>
          {field.label} {field.required && <span className="req">*</span>}
        </label>
      )}
      {field.help && (
        <p className="muted small field-help" id={`${id}-help`}>
          {field.help}
        </p>
      )}
      {input}
      {error && (
        <p className="error small" id={`${id}-err`}>
          {field.label} {error}
        </p>
      )}
    </div>
  );
}
