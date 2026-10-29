import { useMemo, useState, type FormEvent } from "react";
import { isEmpty, visibleFieldIds } from "../logic";
import type { Answer, Answers, Field } from "../types";
import FieldInput from "./FieldInput";

type Props = {
  fields: Field[];
  errors?: Record<string, string>;
  submitting?: boolean;
  onSubmit?: (answers: Answers) => void;
};

export default function FormRenderer({ fields, errors = {}, submitting, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const visible = useMemo(() => new Set(visibleFieldIds(fields, answers)), [fields, answers]);

  const set = (id: string, value: Answer) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setLocalErrors(({ [id]: _, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Quick required check for visible fields; the server re-validates everything
    const missing: Record<string, string> = {};
    for (const f of fields) {
      if (visible.has(f.id) && f.required && isEmpty(answers[f.id])) missing[f.id] = "is required";
    }
    setLocalErrors(missing);
    if (Object.keys(missing).length) {
      document.getElementById(`f-${Object.keys(missing)[0]}`)?.focus();
      return;
    }
    // Only send what's visible, so answers from abandoned branches don't travel
    onSubmit?.(Object.fromEntries(Object.entries(answers).filter(([id]) => visible.has(id))));
  };

  const shownErrors = { ...errors, ...localErrors };

  return (
    <form onSubmit={submit} noValidate className="renderer">
      {fields
        .filter((f) => visible.has(f.id))
        .map((f) => (
          <div key={f.id} className={f.show_if ? "reveal" : undefined}>
            <FieldInput field={f} value={answers[f.id]} error={shownErrors[f.id]} onChange={(v) => set(f.id, v)} />
          </div>
        ))}
      {fields.length === 0 && <p className="muted">This form has no fields yet.</p>}
      {onSubmit && fields.length > 0 && (
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Submit"}
        </button>
      )}
    </form>
  );
}
