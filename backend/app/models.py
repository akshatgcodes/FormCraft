from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, JsonColumn


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Public, unguessable id used in the share link (/f/<slug>)
    slug: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    # {"fields": [...]} — see app/schema.py for the shape
    schema: Mapped[dict[str, Any]] = mapped_column(JsonColumn)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Response.id"
    )


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    # {field_id: value}, only for fields that were visible when submitted
    answers: Mapped[dict[str, Any]] = mapped_column(JsonColumn)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    form: Mapped[Form] = relationship(back_populates="responses")
