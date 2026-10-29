from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Form, Response
from app.schema import validate_submission

router = APIRouter(prefix="/api/public/forms", tags=["public"])

MAX_ANSWER_KEYS = 500


def _published(db: Session, slug: str) -> Form:
    form = db.scalar(select(Form).where(Form.slug == slug))
    # Same 404 for "doesn't exist" and "unpublished", so drafts can't be probed
    if form is None or not form.published:
        raise HTTPException(404, "This form doesn't exist or isn't accepting responses")
    return form


@router.get("/{slug}")
def get_public_form(slug: str, db: Session = Depends(get_db)) -> dict:
    form = _published(db, slug)
    return {"title": form.title, "description": form.description, "schema": form.schema}


@router.post("/{slug}/responses", status_code=201)
def submit(slug: str, answers: dict[str, Any], db: Session = Depends(get_db)) -> dict:
    form = _published(db, slug)
    if len(answers) > MAX_ANSWER_KEYS:
        raise HTTPException(413, "Too many answers")
    # The server re-runs the conditional logic: hidden answers are dropped and required
    # fields are checked only where visible, whatever the client claims
    clean, errors = validate_submission(form.schema.get("fields", []), answers)
    if errors:
        raise HTTPException(422, {"errors": errors})
    response = Response(form_id=form.id, answers=clean)
    db.add(response)
    db.commit()
    return {"id": response.id}
