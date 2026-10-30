import type { Site } from "./types";

export const site: Site = {
  name: "FormCraft",
  letter: "F",
  title: "FormCraft — forms with conditional logic",
  description:
    "A self-hosted form builder with conditional logic: questions appear and disappear based on earlier answers.",
  meta: ["live", "drag-and-drop builder", "GPLv3"],
  headline: ["Forms that", "answer back."],
  intro:
    "Drag fields onto a form, publish it, share a link. The difference from a toy builder is conditional logic: \"Are you a student?\" → Yes → \"College name\" and \"Year of study\" appear. Pick 3rd year and an internship question shows up.",
  primary: { label: "Open the builder", href: "/app/" },
  repo: "https://github.com/akshatgcodes/FormCraft",
  note: "Demo password: `demo1234`. Click ‘Start from example’ to get a form with branching already set up.",
  xfactor: {
    title: "Logic the server checks too.",
    intro:
      "Hiding a field in the browser is easy. FormCraft re-runs every condition on the server, so the stored answers always match what the person actually saw.",
    features: [
      {
        icon: "⑂",
        title: "Nested conditions",
        body: "Rules like \"Languages\" contains Rust, combined into nested `all` / `any` trees. Eight operators, from `equals` to `gt`.",
      },
      {
        icon: "⇅",
        title: "Only upward",
        body: "A condition can only use fields above it, so there are no cycles to detect. Drag a field above its dependency and the card turns red before you save.",
      },
      {
        icon: "✓",
        title: "One logic, two languages",
        body: "Python on the server, TypeScript in the browser, and both are tested against the same 25 cases in `shared/conditions.json` so they can't drift.",
      },
    ],
  },
  preview: {
    intro:
      "The builder with its palette and live preview, the warning when a condition points at a field below it, and the responses table with CSV export.",
    shots: [
      { src: "/shots/builder.png", alt: "Form builder with a field palette, the form being edited and a condition editor", caption: "Builder" },
      { src: "/shots/warning.png", alt: "A field card turned red because its condition uses a field below it", caption: "Broken logic, caught live" },
      { src: "/shots/responses.png", alt: "Responses table with search and a CSV export button", caption: "Responses" },
    ],
  },
  stack: ["React 19", "TypeScript", "Vite", "React Router", "dnd-kit", "FastAPI", "Pydantic 2", "SQLAlchemy 2", "PostgreSQL JSONB", "pytest", "Vitest"],
  concepts: [
    { title: "Hidden answers are dropped", body: "On submit the server works out which fields were visible, throws away answers to the rest, and enforces `required` only where it applies." },
    { title: "JSONB schemas", body: "Every form has a different shape, so the schema and the answers are JSONB columns instead of a table per field." },
    { title: "Seven field types", body: "Short text, paragraph, email, number, dropdown, checkboxes and date, each with its own validation: length, regex pattern, min and max." },
    { title: "Keyboard drag-and-drop", body: "dnd-kit sortable lists, so fields can be reordered with the mouse or the keyboard." },
    { title: "Safe CSV export", body: "Columns are kept for deleted fields, and answers starting with `=`, `+`, `-` or `@` are escaped so spreadsheets don't run them as formulas." },
    { title: "Owner-only builder", body: "A single owner password and a signed session cookie for the builder; filling a published form needs no login." },
  ],
  run: {
    title: "Run your own",
    intro: "SQLite is used locally when `DATABASE_URL` isn't set, so there's nothing else to install.",
    blocks: [
      {
        title: "API",
        steps: [
          { text: "Install, then set `ADMIN_PASSWORD` in `.env`:", cmd: "cd backend && uv sync\ncp .env.example .env" },
          { text: "Start it on port 8000:", cmd: "uv run uvicorn app.main:app --reload" },
        ],
      },
      {
        title: "App",
        steps: [
          { text: "Install and start Vite:", cmd: "cd frontend && npm install\nnpm run dev" },
          { text: "Open it and click ‘Start from example’:", cmd: "http://localhost:5173" },
        ],
      },
    ],
  },
  tagline: "a form builder with conditional logic.",
};
