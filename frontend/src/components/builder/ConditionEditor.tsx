import { useEffect, useState } from "react";
import { OP_LABELS, OPS_FOR_TYPE, VALUELESS } from "../../logic";
import type { Condition, Field, Op, Rule } from "../../types";

type Props = {
  value: Condition | undefined;
  earlier: Field[];
  onChange: (cond: Condition | undefined) => void;
};

type Flat = { mode: "all" | "any"; rules: Rule[] };

/** A condition the simple UI can edit: one rule, or one all/any group of rules. */
function toFlat(cond: Condition | undefined): Flat | null {
  if (!cond) return { mode: "all", rules: [] };
  if ("field" in cond) return { mode: "all", rules: [cond] };
  const kids = "all" in cond ? cond.all : cond.any;
  if (!kids.every((k) => "field" in k)) return null;
  return { mode: "all" in cond ? "all" : "any", rules: kids as Rule[] };
}

function fromFlat({ mode, rules }: Flat): Condition | undefined {
  if (rules.length === 0) return undefined;
  if (rules.length === 1) return rules[0];
  return mode === "all" ? { all: rules } : { any: rules };
}

function defaultRule(target: Field): Rule {
  const op = OPS_FOR_TYPE[target.type][0];
  const value = target.options?.[0] ?? (target.type === "number" ? 0 : "");
  return { field: target.id, op, value };
}

export default function ConditionEditor({ value, earlier, onChange }: Props) {
  const flat = toFlat(value);
  const [advanced, setAdvanced] = useState(flat === null);

  if (earlier.length === 0) {
    return <p className="muted small">Conditions can depend on fields above this one. This is the first field.</p>;
  }
  if (advanced || flat === null) {
    return <JsonEditor value={value} onChange={onChange} onSimple={flat ? () => setAdvanced(false) : undefined} />;
  }

  const update = (next: Flat) => onChange(fromFlat(next));
  const setRule = (i: number, rule: Rule) => update({ ...flat, rules: flat.rules.map((r, j) => (j === i ? rule : r)) });

  return (
    <div className="cond">
      {flat.rules.length === 0 && <p className="muted small">Always shown.</p>}
      {flat.rules.length > 1 && (
        <div className="cond-mode">
          Show when
          <select value={flat.mode} onChange={(e) => update({ ...flat, mode: e.target.value as Flat["mode"] })}>
            <option value="all">all</option>
            <option value="any">any</option>
          </select>
          of these match:
        </div>
      )}
      {flat.rules.map((rule, i) => {
        const target = earlier.find((f) => f.id === rule.field);
        return (
          <div key={i} className="cond-rule">
            <select
              aria-label="Field"
              value={rule.field}
              onChange={(e) => setRule(i, defaultRule(earlier.find((f) => f.id === e.target.value)!))}
            >
              {!target && <option value={rule.field}>{rule.field} (missing)</option>}
              {earlier.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {target && (
              <select
                aria-label="Operator"
                value={rule.op}
                onChange={(e) => {
                  const op = e.target.value as Op;
                  setRule(i, VALUELESS.includes(op) ? { field: rule.field, op } : { ...defaultRule(target), op, value: rule.value ?? defaultRule(target).value });
                }}
              >
                {OPS_FOR_TYPE[target.type].map((op) => (
                  <option key={op} value={op}>
                    {OP_LABELS[op]}
                  </option>
                ))}
              </select>
            )}
            {target && !VALUELESS.includes(rule.op) && <ValueInput target={target} rule={rule} onChange={(r) => setRule(i, r)} />}
            <button className="icon-btn" onClick={() => update({ ...flat, rules: flat.rules.filter((_, j) => j !== i) })} aria-label="Remove rule">
              ✕
            </button>
          </div>
        );
      })}
      <div className="row">
        <button className="btn btn-sm" onClick={() => update({ ...flat, rules: [...flat.rules, defaultRule(earlier[earlier.length - 1])] })}>
          + Add rule
        </button>
        <button className="link-btn small" onClick={() => setAdvanced(true)}>
          Edit as JSON
        </button>
      </div>
    </div>
  );
}

function ValueInput({ target, rule, onChange }: { target: Field; rule: Rule; onChange: (r: Rule) => void }) {
  if (target.options?.length) {
    return (
      <select aria-label="Value" value={String(rule.value ?? "")} onChange={(e) => onChange({ ...rule, value: e.target.value })}>
        {target.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (target.type === "number") {
    return (
      <input
        aria-label="Value"
        type="number"
        value={rule.value === undefined || rule.value === null ? "" : String(rule.value)}
        onChange={(e) => onChange({ ...rule, value: e.target.value === "" ? null : Number(e.target.value) })}
      />
    );
  }
  return (
    <input
      aria-label="Value"
      type={target.type === "date" ? "date" : "text"}
      value={String(rule.value ?? "")}
      onChange={(e) => onChange({ ...rule, value: e.target.value })}
    />
  );
}

/** Nested conditions ({all: [..., {any: [...]}]}) are valid but too deep for the simple UI. */
type JsonProps = Pick<Props, "value" | "onChange"> & { onSimple?: () => void };

function JsonEditor({ value, onChange, onSimple }: JsonProps) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setText(JSON.stringify(value ?? null, null, 2)), [value]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text);
      onChange(parsed ?? undefined);
      setError(null);
    } catch {
      setError("Not valid JSON");
    }
  };

  return (
    <div className="cond">
      <p className="muted small">
        Nested condition. Groups are <code>{'{"all": [...]}'}</code> or <code>{'{"any": [...]}'}</code>; rules are{" "}
        <code>{'{"field", "op", "value"}'}</code>. Checked on save.
      </p>
      <textarea className="mono" rows={8} value={text} onChange={(e) => setText(e.target.value)} onBlur={apply} aria-label="Condition JSON" />
      {error && <p className="error small">{error}</p>}
      <div className="row">
        {onSimple && (
          <button className="link-btn small" onClick={onSimple}>
            Back to simple editor
          </button>
        )}
        <button className="link-btn small" onClick={() => onChange(undefined)}>
          Remove condition
        </button>
      </div>
    </div>
  );
}
