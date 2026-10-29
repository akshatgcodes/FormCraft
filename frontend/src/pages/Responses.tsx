import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { Answer, Form, ResponsesPage } from "../types";

const show = (v: Answer) => (v === undefined || v === null ? "" : Array.isArray(v) ? v.join(", ") : String(v));

export default function Responses() {
  const id = Number(useParams().id);
  const [form, setForm] = useState<Form | null>(null);
  const [data, setData] = useState<ResponsesPage | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.form(id).then(setForm);
    api.responses(id).then(setData);
  }, [id]);

  const q = query.trim().toLowerCase();
  const rows = data?.responses.filter((r) => !q || Object.values(r.answers).some((v) => show(v).toLowerCase().includes(q))) ?? [];

  return (
    <main className="page">
      <Link to="/" className="link-btn">
        ← Forms
      </Link>
      <div className="page-head">
        <div>
          <h1>{form?.title ?? "…"}</h1>
          <p className="muted small">{data ? `${data.responses.length} responses` : "Loading…"}</p>
        </div>
        <div className="row wrap">
          <input type="search" placeholder="Search answers" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search answers" />
          <Link className="btn" to={`/forms/${id}/edit`}>
            Edit form
          </Link>
          <a className="btn btn-primary" href={api.csvUrl(id)} download>
            Export CSV
          </a>
        </div>
      </div>

      {data && data.responses.length === 0 && <div className="empty muted">No responses yet. Publish the form and share its link.</div>}

      {data && data.responses.length > 0 && (
        <div className="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                {data.columns.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap muted">{new Date(r.created_at + "Z").toLocaleString()}</td>
                  {data.columns.map((c) => (
                    <td key={c.id} className={r.answers[c.id] === undefined ? "skipped" : undefined}>
                      {r.answers[c.id] === undefined ? "—" : show(r.answers[c.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
