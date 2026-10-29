# Decisions

### 1. Conditions can only reference fields above them
**Context:** Arbitrary references allow cycles (A shows if B, B shows if A) and make evaluation order ambiguous.
**Decision:** A `show_if` may only use fields earlier in the list. Enforced in the builder (live) and by `check_schema` (on save).
**Why:** Acyclic by construction; visibility is a single pass; it matches reading order.
**Trade-off:** Reordering can break a condition. The builder flags it immediately instead of failing silently.

### 2. Conditions are evaluated against visible answers only
**Decision:** While walking the form, a hidden field's answer is not visible to later conditions, and it's dropped on submit.
**Why:** If someone picks "Yes", answers the student branch, then switches to "No", the old answers must not keep later student-only fields visible or end up in the data.

### 3. Same logic in Python and TypeScript, one shared test file
**Context:** The UI must toggle instantly; the server must not trust the client.
**Decision:** `schema.py` and `logic.ts` implement the same evaluation; `shared/conditions.json` holds the cases and both pytest and Vitest run all of them.
**Trade-off:** Two implementations to maintain. The shared cases make drift a failing test rather than a production bug.

### 4. JSONB for schemas and answers
**Decision:** One `schema` column per form and one `answers` column per response, JSONB on Postgres and JSON on SQLite.
**Why:** Each form has a different shape; no per-form tables or migrations. Postgres can still index inside JSONB if response queries grow.
**Trade-off:** The database doesn't enforce answer types; `validate_submission` does.

### 5. Single owner password instead of user accounts
**Decision:** `ADMIN_PASSWORD` in the environment, checked with a constant-time compare, then a signed `HttpOnly` cookie.
**Why:** It's self-hosted: one person builds the forms. Accounts and OAuth would add a lot for no user.
**Trade-off:** No multi-user support; adding it means an `owner_id` on forms.

### 6. Random slugs for share links
**Decision:** Public links use `secrets.token_urlsafe(8)`, not the numeric id; drafts and missing forms return the same 404.
**Why:** Forms can't be enumerated by counting ids, and drafts can't be detected.

### 7. CSV export neutralises formulas
**Decision:** Cells starting with `=`, `+`, `-`, `@`, tab or CR get a leading `'`.
**Why:** A respondent could otherwise put `=HYPERLINK(...)` in a text answer that runs when the owner opens the export in Excel or Sheets.

### 8. Manual Save instead of autosave
**Decision:** Edits are local until Save (or Ctrl/Cmd+S); leaving with unsaved edits warns.
**Why:** The server validates the whole schema, and a half-edited condition is often invalid. Autosave would show errors mid-edit. Publish saves first.

---

<div align="center">

<h3>Akshat Gupta</h3>

<a href="https://akshatgcodes.in"><img src="https://img.shields.io/badge/Website-akshatgcodes.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/akshatgcodes"><img src="https://img.shields.io/badge/LinkedIn-akshatgcodes-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/akshatgcodes"><img src="https://img.shields.io/badge/GitHub-akshatgcodes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:akshatgcodes@gmail.com"><img src="https://img.shields.io/badge/Email-akshatgcodes%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
