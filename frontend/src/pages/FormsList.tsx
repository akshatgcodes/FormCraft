import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, shareUrl } from "../api";
import type { Form } from "../types";
import { TEMPLATE } from "../template";

export default function FormsList() {
  const [forms, setForms] = useState<Form[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.forms().then(setForms);
  }, []);

  const create = async (withTemplate: boolean) => {
    const form = await api.createForm(
      withTemplate ? TEMPLATE : { title: "Untitled form", description: "", schema: { fields: [] } },
    );
    navigate(`/forms/${form.id}/edit`);
  };

  const remove = async (f: Form) => {
    if (!confirm(`Delete "${f.title}" and all ${f.response_count ?? 0} responses?`)) return;
    await api.deleteForm(f.id);
    setForms((fs) => fs!.filter((x) => x.id !== f.id));
  };

  return (
    <main className="page">
      <div className="page-head">
        <h1>Your forms</h1>
        <div className="row">
          <button className="btn" onClick={() => create(true)}>
            Start from example
          </button>
          <button className="btn btn-primary" onClick={() => create(false)}>
            + New form
          </button>
        </div>
      </div>

      {forms === null && <p className="muted">Loading…</p>}
      {forms?.length === 0 && (
        <div className="empty">
          <p>No forms yet.</p>
          <p className="muted">"Start from example" creates a signup form with conditional fields to explore.</p>
        </div>
      )}

      <ul className="form-list">
        {forms?.map((f) => (
          <li key={f.id} className="panel form-row">
            <div className="form-row-main">
              <Link to={`/forms/${f.id}/edit`} className="form-title">
                {f.title}
              </Link>
              <div className="muted small">
                {f.schema.fields.length} fields · {f.response_count} responses ·{" "}
                <span className={f.published ? "badge badge-live" : "badge"}>{f.published ? "Live" : "Draft"}</span>
              </div>
            </div>
            <div className="row wrap">
              {f.published && (
                <a className="btn btn-sm" href={shareUrl(f.slug)} target="_blank" rel="noreferrer">
                  Open
                </a>
              )}
              <Link className="btn btn-sm" to={`/forms/${f.id}/responses`}>
                Responses
              </Link>
              <Link className="btn btn-sm" to={`/forms/${f.id}/edit`}>
                Edit
              </Link>
              <button className="btn btn-sm btn-ghost" onClick={() => remove(f)} aria-label={`Delete ${f.title}`}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
