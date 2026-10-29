import csv
import io
import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_owner
from app.db import get_db
from app.models import Form, Response
from app.schema import FormSchema, check_schema

router = APIRouter(prefix="/api/forms", tags=["forms"], dependencies=[Depends(require_owner)])


class FormIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    schema_: FormSchema = Field(default_factory=FormSchema, alias="schema")


class PublishIn(BaseModel):
    published: bool


def _validated_schema(body: FormIn) -> dict[str, Any]:
    problems = check_schema(body.schema_)
    if problems:
        # 422 with field ids, so the builder can point at the broken field
        raise HTTPException(422, [{"field": f, "message": m} for f, m in problems])
    return body.schema_.model_dump(exclude_none=True)


def serialize(form: Form, response_count: int | None = None) -> dict:
    out = {
        "id": form.id,
        "slug": form.slug,
        "title": form.title,
        "description": form.description,
        "schema": form.schema,
        "published": form.published,
        "created_at": form.created_at.isoformat(),
        "updated_at": form.updated_at.isoformat(),
    }
    if response_count is not None:
        out["response_count"] = response_count
    return out


def _get(db: Session, form_id: int) -> Form:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(404, "Form not found")
    return form


@router.get("")
def list_forms(db: Session = Depends(get_db)) -> list[dict]:
    counts = dict(
        db.execute(select(Response.form_id, func.count()).group_by(Response.form_id)).all()
    )
    forms = db.scalars(select(Form).order_by(Form.updated_at.desc(), Form.id.desc())).all()
    return [serialize(f, counts.get(f.id, 0)) for f in forms]


@router.post("", status_code=201)
def create_form(body: FormIn, db: Session = Depends(get_db)) -> dict:
    form = Form(
        slug=secrets.token_urlsafe(8),
        title=body.title.strip(),
        description=body.description,
        schema=_validated_schema(body),
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return serialize(form, 0)


@router.get("/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)) -> dict:
    return serialize(_get(db, form_id))


@router.put("/{form_id}")
def update_form(form_id: int, body: FormIn, db: Session = Depends(get_db)) -> dict:
    form = _get(db, form_id)
    form.title = body.title.strip()
    form.description = body.description
    form.schema = _validated_schema(body)
    db.commit()
    db.refresh(form)
    return serialize(form)


@router.post("/{form_id}/publish")
def publish(form_id: int, body: PublishIn, db: Session = Depends(get_db)) -> dict:
    form = _get(db, form_id)
    if body.published and not form.schema.get("fields"):
        raise HTTPException(422, "Add at least one field before publishing")
    form.published = body.published
    db.commit()
    db.refresh(form)
    return serialize(form)


@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get(db, form_id))
    db.commit()


def _columns(form: Form) -> list[tuple[str, str]]:
    """Current fields first, then ids that only exist in older responses (a field was
    deleted after people answered it), so no submitted data disappears from the export."""
    cols = [(f["id"], f["label"]) for f in form.schema.get("fields", [])]
    known = {c[0] for c in cols}
    for r in form.responses:
        for key in r.answers:
            if key not in known:
                cols.append((key, f"{key} (removed)"))
                known.add(key)
    return cols


@router.get("/{form_id}/responses")
def list_responses(form_id: int, db: Session = Depends(get_db)) -> dict:
    form = _get(db, form_id)
    return {
        "columns": [{"id": i, "label": label} for i, label in _columns(form)],
        "responses": [
            {"id": r.id, "created_at": r.created_at.isoformat(), "answers": r.answers}
            for r in reversed(form.responses)
        ],
    }


def _cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "; ".join(map(str, value))
    text = str(value)
    # Stop spreadsheet apps from running answers like "=HYPERLINK(...)" as formulas
    return f"'{text}" if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


@router.get("/{form_id}/responses.csv")
def export_csv(form_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    form = _get(db, form_id)
    cols = _columns(form)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Submitted at", *[label for _, label in cols]])
    for r in form.responses:
        writer.writerow([r.created_at.isoformat(), *[_cell(r.answers.get(i)) for i, _ in cols]])
    safe = "".join(c if c.isalnum() else "-" for c in form.title).strip("-")[:50] or "form"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe}-responses.csv"'},
    )
