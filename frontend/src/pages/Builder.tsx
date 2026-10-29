import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api, ApiError, shareUrl } from "../api";
import { forwardRefs, referencedFields, removeRefs } from "../logic";
import type { Field, FieldType, Form } from "../types";
import Palette from "../components/builder/Palette";
import Canvas from "../components/builder/Canvas";
import Inspector from "../components/builder/Inspector";
import FormRenderer from "../components/FormRenderer";
import { FIELD_TYPES, newField } from "../components/builder/fieldTypes";

type ServerProblem = { field: string | null; message: string };

export default function Builder() {
  const id = Number(useParams().id);
  const [form, setForm] = useState<Form | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverProblems, setServerProblems] = useState<ServerProblem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [dragging, setDragging] = useState<FieldType | null>(null);

  useEffect(() => {
    api.form(id).then((f) => {
      setForm(f);
      setTitle(f.title);
      setDescription(f.description);
      setFields(f.schema.fields);
    });
  }, [id]);

  const edit = (next: Field[]) => {
    setFields(next);
    setDirty(true);
    setServerProblems([]);
  };

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const saved = await api.saveForm(id, { title, description, schema: { fields } });
      setForm(saved);
      setDirty(false);
      setServerProblems([]);
      setNotice("Saved");
      return true;
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.detail) && e.detail[0]?.message) {
        setServerProblems(e.detail as ServerProblem[]);
        setNotice("Fix the highlighted fields before saving");
      } else {
        setNotice(e instanceof Error ? e.message : "Save failed");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, title, description, fields]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const togglePublish = async () => {
    if (!form) return;
    if (dirty && !(await save())) return;
    try {
      setForm(await api.publish(id, !form.published));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't publish");
    }
  };

  // Local check for the rule the server enforces, plus whatever the server last said
  const problems = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [fid, refs] of Object.entries(forwardRefs(fields))) {
      const known = refs.filter((r) => fields.some((f) => f.id === r));
      out[fid] = [
        known.length
          ? `Condition uses a field below it (${known.join(", ")}). Move this field down.`
          : `Condition uses a deleted field (${refs.join(", ")}).`,
      ];
    }
    for (const p of serverProblems) {
      // The local check already explains upward-only violations in builder terms
      if (!p.field || (out[p.field] && p.message.includes("isn't a field above"))) continue;
      (out[p.field] ??= []).push(p.message);
    }
    return out;
  }, [fields, serverProblems]);

  const add = (type: FieldType, index = fields.length) => {
    const f = newField(type, fields);
    edit([...fields.slice(0, index), f, ...fields.slice(index)]);
    setSelectedId(f.id);
  };

  const duplicate = (fid: string) => {
    const i = fields.findIndex((f) => f.id === fid);
    const copy = { ...structuredClone(fields[i]), id: newField(fields[i].type, fields).id, label: `${fields[i].label} (copy)` };
    edit([...fields.slice(0, i + 1), copy, ...fields.slice(i + 1)]);
    setSelectedId(copy.id);
  };

  const remove = (fid: string) => {
    const dependents = fields.filter((f) => referencedFields(f.show_if).includes(fid));
    if (dependents.length && !confirm(`Fields depend on this one: ${dependents.map((d) => d.label).join(", ")}. Delete it and remove those conditions?`)) {
      return;
    }
    edit(fields.filter((f) => f.id !== fid).map((f) => ({ ...f, show_if: removeRefs(f.show_if, fid) })));
    if (selectedId === fid) setSelectedId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const a = String(active.id);
    setDragging(a.startsWith("new:") ? (a.slice(4) as FieldType) : null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over) return;
    const a = String(active.id);
    const o = String(over.id);
    if (a.startsWith("new:")) {
      const index = o === "canvas" ? fields.length : fields.findIndex((f) => f.id === o);
      add(a.slice(4) as FieldType, index === -1 ? fields.length : index);
    } else if (a !== o && o !== "canvas") {
      edit(arrayMove(fields, fields.findIndex((f) => f.id === a), fields.findIndex((f) => f.id === o)));
    }
  };

  if (!form) return <main className="page muted">Loading…</main>;

  const selectedIndex = fields.findIndex((f) => f.id === selectedId);
  const selected = fields[selectedIndex];

  return (
    <main className="builder">
      <div className="builder-bar">
        <Link to="/" className="link-btn">
          ← Forms
        </Link>
        <div className="row wrap">
          {notice && <span className="notice" role="status">{notice}</span>}
          <span className="muted small">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <button className={`btn btn-sm ${preview ? "active" : ""}`} onClick={() => setPreview((p) => !p)}>
            {preview ? "Back to editor" : "Preview"}
          </button>
          <button className="btn btn-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className={`btn btn-sm ${form.published ? "" : "btn-primary"}`} onClick={togglePublish}>
            {form.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {form.published && (
        <div className="share">
          <span className="badge badge-live">Live</span>
          <code className="share-url">{shareUrl(form.slug)}</code>
          <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(shareUrl(form.slug)).then(() => setNotice("Link copied"))}>
            Copy link
          </button>
          <Link className="btn btn-sm" to={`/forms/${id}/responses`}>
            Responses
          </Link>
        </div>
      )}

      {serverProblems.some((p) => !p.field) && (
        <p className="error">{serverProblems.filter((p) => !p.field).map((p) => p.message).join(" ")}</p>
      )}

      {preview ? (
        <section className="panel preview">
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
          <FormRenderer fields={fields} />
          <p className="muted small">Preview: answers aren't saved. Conditional fields appear as you answer.</p>
        </section>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="builder-grid">
            <Palette onAdd={(t) => add(t)} />

            <section className="builder-main">
              <input
                className="title-input"
                value={title}
                onChange={(e) => (setTitle(e.target.value), setDirty(true))}
                aria-label="Form title"
                maxLength={200}
              />
              <textarea
                className="desc-input"
                value={description}
                onChange={(e) => (setDescription(e.target.value), setDirty(true))}
                placeholder="Description (optional)"
                rows={2}
                aria-label="Form description"
              />
              <Canvas
                fields={fields}
                acceptingNew={dragging !== null}
                selectedId={selectedId}
                problems={problems}
                onSelect={setSelectedId}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            </section>

            <aside className="panel inspector-panel">
              {selected ? (
                <Inspector
                  key={selected.id}
                  field={selected}
                  earlier={fields.slice(0, selectedIndex)}
                  dependents={fields.filter((f) => referencedFields(f.show_if).includes(selected.id))}
                  onChange={(f) => edit(fields.map((x) => (x.id === f.id ? f : x)))}
                />
              ) : (
                <p className="muted small">Select a field to edit its question, validation and conditions.</p>
              )}
            </aside>
          </div>
          <DragOverlay>
            {dragging && <div className="palette-item overlay">{FIELD_TYPES.find((t) => t.type === dragging)!.label}</div>}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  );
}
