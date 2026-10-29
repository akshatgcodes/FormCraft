<p align="center">
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"
       fill="none" stroke="#5b4bdb" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 3v12"/>
    <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M15 6a9 9 0 0 0-9 9"/>
  </svg>
</p>

<h1 align="center">FormCraft</h1>

<p align="center">
  <strong>A self-hosted form builder with conditional logic: questions appear and disappear based on earlier answers.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL_JSONB-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL JSONB">
  <img src="https://img.shields.io/badge/license-GPL--3.0-5b4bdb?style=flat-square" alt="License">
</p>

---

## What is FormCraft?

Drag fields onto a form, set labels and validation, publish, and share a link. Responses land in a table you can search and export to CSV.

The feature that separates it from a toy builder is **conditional logic**. *"Are you a student?" → Yes → show "College name" and "Year of study".* Pick 3rd or 4th year and an internship question appears. Conditions can be nested `all`/`any` trees, and the server re-runs them on every submission, so hidden answers are never stored and required fields are only enforced where they're visible.

---

## What you get

- **Drag-and-drop builder.** Drag from the palette to any position, reorder with mouse or keyboard (dnd-kit), duplicate, delete. Click-to-add works too.
- **Seven field types.** Short text, paragraph, email, number, dropdown, checkboxes, date, each with fitting validation (length, regex pattern, min/max).
- **Condition editor.** Rules like *"Languages" contains Rust*; combine with all/any; nested trees through a JSON editor.
- **Live preview.** Try the form while building. Fields appear as you answer.
- **Builder catches broken logic.** A condition can only use fields above it. Move a field above its dependency and the card turns red before you even save. Deleting a field offers to strip conditions that used it.
- **Responses dashboard.** Search answers, "—" for skipped branches, CSV export that keeps columns for deleted fields and neutralises spreadsheet formula injection.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 · TypeScript · Vite · React Router · dnd-kit |
| Backend | FastAPI · Pydantic 2 · SQLAlchemy 2 |
| Database | PostgreSQL with JSONB for schemas and answers; SQLite JSON for local dev |
| Auth | Single owner password, signed session cookie |
| Tooling | uv · pytest · Vitest · ruff · GitHub Actions |

---

## Run it

```bash
# API → http://localhost:8000/docs
cd backend && uv sync && cp .env.example .env    # set ADMIN_PASSWORD
uv run uvicorn app.main:app --reload

# App → http://localhost:5173
cd frontend && npm install && npm run dev
```

Log in with your `ADMIN_PASSWORD`, click **Start from example**, and open **Preview** to see the branching. Details in [docs/SETUP.md](docs/SETUP.md).

---

## Engineering Decisions

**Why can conditions only look upward?**
It makes the dependency graph acyclic by construction, so visibility is one top-to-bottom pass with no cycle detection. It also matches how people read a form. The builder enforces it live and the API rejects violations with the offending field id.

**Why does the logic exist twice, in Python and TypeScript?**
The browser needs it to toggle fields instantly; the server needs it because the client can't be trusted. To stop them drifting, both are tested against the same 25 cases in [`shared/conditions.json`](shared/conditions.json).

**Why JSONB instead of a table per field?**
Every form has a different shape. A schema column and an answers column keep forms flexible without migrations per form, and Postgres can still index and query inside them.

**What would you do differently in v2?**
Version the schema on publish. Today, editing a live form changes what earlier responses are shown against; the CSV export keeps removed fields, but a renamed option silently diverges from old answers.

More in [docs/DECISIONS.md](docs/DECISIONS.md).

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements: goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, schema format, API |
| [Decisions](docs/DECISIONS.md) | Every major technical decision and why |
| [Setup](docs/SETUP.md) | Local dev setup and env vars |
| [Deploy](docs/DEPLOY.md) | Deployment notes |
| [Contributing](CONTRIBUTING.md) | How to propose changes |
| [Changelog](CHANGELOG.md) | What changed in each release |
| [Security](SECURITY.md) | How to report a vulnerability |

---

<div align="center">

<h3>Akshat Gupta</h3>

<a href="https://akshatgcodes.in"><img src="https://img.shields.io/badge/Website-akshatgcodes.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/akshatgcodes"><img src="https://img.shields.io/badge/LinkedIn-akshatgcodes-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/akshatgcodes"><img src="https://img.shields.io/badge/GitHub-akshatgcodes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:akshatgcodes@gmail.com"><img src="https://img.shields.io/badge/Email-akshatgcodes%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
