"""User-defined content types and their field definitions.

A ``ContentType`` (e.g. "Vélo", "Parcours") is a schema the user builds in the
admin — no code, no migration. Its ``FieldDefinition`` rows describe the fields;
``ContentEntry`` rows (see content_entry.py) hold the data as JSON validated
against those definitions.
"""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

# Supported field types. `select` uses config.options; `relation` uses
# config.relation (a target content-type slug).
FIELD_TYPES = (
    "text", "textarea", "richtext", "number", "boolean",
    "date", "media", "select", "relation",
)


class ContentType(BaseModel):
    __tablename__ = "content_type"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), nullable=False, unique=True, index=True)
    icon: Mapped[str] = mapped_column(String(60), nullable=True, default="bi-collection")
    description: Mapped[str] = mapped_column(String(400), nullable=True)
    is_singleton: Mapped[bool] = mapped_column(Boolean, default=False)

    fields = relationship(
        "FieldDefinition", cascade="all, delete-orphan",
        order_by="FieldDefinition.sort_order", lazy="selectin")

    def to_dict(self, *, with_fields: bool = True, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(name=self.name, slug=self.slug, icon=self.icon,
                    description=self.description, is_singleton=self.is_singleton)
        if with_fields:
            data["fields"] = [f.to_dict() for f in self.fields]
        return data


class FieldDefinition(BaseModel):
    __tablename__ = "field_definition"

    content_type_id: Mapped[int] = mapped_column(
        ForeignKey("content_type.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    field_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_title: Mapped[bool] = mapped_column(Boolean, default=False)  # used as the entry label
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    def to_dict(self, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(key=self.key, label=self.label, field_type=self.field_type,
                    required=self.required, is_title=self.is_title,
                    sort_order=self.sort_order, config=self.config or {})
        return data
