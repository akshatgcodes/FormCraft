# Architecture

## Overview

```
 Owner (logged in)                       Respondent (public link)
 ┌──────────────────────────────┐        ┌────────────────────────┐
 │ Forms list · Builder         │        │ /f/<slug>              │
 │ Palette │ Canvas │ Inspector │        │ FormRenderer           │
 │ Preview · Responses · CSV    │        │ logic.ts (live toggle) │
 └──────────────┬───────────────┘        └───────────┬────────────┘
                │ /api/forms/*  (session cookie)     │ /api/public/forms/*
                ▼                                    ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ FastAPI                                                          │
 │  auth.py      owner password → signed cookie                     │
 │  forms.py     CRUD · publish · responses · CSV                   │
 │  public.py    published form · submit                            │
 │  schema.py    pydantic models · check_schema · evaluate ·        │
 │               validate_submission                                │
 └──────────────────────────────┬───────────────────────────────────┘
                                ▼
                 forms(schema JSONB) · responses(answers JSONB)
```

## Schema format

```json
{
  "fields": [
    { "id": "is_student", "type": "dropdown", "label": "Are you a student?",
      "required": true, "options": ["Yes", "No"] },
    { "id": "college", "type": "text", "label": "College name", "required": true,
      "show_if": { "field": "is_student", "op": "equals", "value": "Yes" } },
    { "id": "internship", "type": "textarea", "label": "Internship?",
      "show_if": { "all": [
        { "field": "is_student", "op": "equals", "value": "Yes" },
        { "any": [ { "field": "year", "op": "equals", "value": "3rd" },
                   { "field": "year", "op": "equals", "value": "4th" } ] } ] } }
  ]
}
```

| Operator | Field types |
|---|---|
| `equals`, `not_equals` | text, email, number, dropdown, date |
| `contains`, `not_contains` | text, paragraph, email, checkboxes (substring, case-insensitive, or list membership) |
| `gt`, `lt` | number, date |
| `empty`, `not_empty` | all |

## Checks on save (`check_schema`)

Pydantic handles structure (types, id format `^[a-z][a-z0-9_]{0,39}$`, unknown keys). `check_schema` adds what pydantic can't express:

- unique field ids; choice fields have unique, non-empty options
- conditions reference a field **above** (no forward or self references → no cycles)
- the operator fits the referenced field's type; the value has the right type and, for choices, is one of the options
- regex patterns compile; min length ≤ max length; nesting ≤ 5 levels

Errors come back as `422 [{"field": "college", "message": "..."}]` so the builder can highlight the card.

## Submission flow (`POST /api/public/forms/{slug}/responses`)

1. Look up the form by slug; unpublished and missing return the same 404
2. Walk fields top to bottom. A field is visible if it has no `show_if` or the condition holds against the **clean answers so far**. Hidden fields are skipped and their answers discarded, so a stale answer can't make a later field appear.
3. For visible fields: empty → required error; otherwise coerce and validate by type
4. Any errors → `422 {"errors": {field_id: message}}`; else store the clean answers

## Data model

```
forms       id · slug (unique, random) · title · description · schema JSONB · published · created_at · updated_at
responses   id · form_id → forms (cascade) · answers JSONB · created_at
```

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout` · GET `/api/auth/me` | |
| GET / POST | `/api/forms` | owner |
| GET / PUT / DELETE | `/api/forms/{id}` | owner |
| POST | `/api/forms/{id}/publish` | owner |
| GET | `/api/forms/{id}/responses`, `/api/forms/{id}/responses.csv` | owner |
| GET | `/api/public/forms/{slug}` | public, published only |
| POST | `/api/public/forms/{slug}/responses` | public, published only |

---

<div align="center">

<h3>Akshat Gupta</h3>

<a href="https://akshatgcodes.in"><img src="https://img.shields.io/badge/Website-akshatgcodes.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/akshatgcodes"><img src="https://img.shields.io/badge/LinkedIn-akshatgcodes-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/akshatgcodes"><img src="https://img.shields.io/badge/GitHub-akshatgcodes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:akshatgcodes@gmail.com"><img src="https://img.shields.io/badge/Email-akshatgcodes%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
