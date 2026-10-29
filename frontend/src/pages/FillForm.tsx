import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import FormRenderer from "../components/FormRenderer";
import { Logo } from "../components/RequireOwner";
import type { Answers, PublicForm } from "../types";

export default function FillForm() {
  const { slug = "" } = useParams();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.publicForm(slug).then(setForm).catch((e) => setLoadError(e.message));
  }, [slug]);

  useEffect(() => {
    if (form) document.title = form.title;
  }, [form]);

  const submit = async (answers: Answers) => {
    setSubmitting(true);
    try {
      await api.submit(slug, answers);
      setDone(true);
    } catch (e) {
      const detail = e instanceof ApiError ? (e.detail as { errors?: Record<string, string> }) : null;
      if (detail?.errors) setErrors(detail.errors);
      else setLoadError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fill">
      <div className="panel fill-card">
        {loadError && <p className="error">{loadError}</p>}
        {!form && !loadError && <p className="muted">Loading…</p>}
        {form && done && (
          <div className="thanks">
            <h1>Thanks!</h1>
            <p className="muted">Your response to "{form.title}" was recorded.</p>
          </div>
        )}
        {form && !done && (
          <>
            <h1>{form.title}</h1>
            {form.description && <p className="muted">{form.description}</p>}
            <FormRenderer fields={form.schema.fields} errors={errors} submitting={submitting} onSubmit={submit} />
          </>
        )}
      </div>
      <p className="muted small made-with">
        <Logo /> Made with FormCraft
      </p>
    </main>
  );
}
