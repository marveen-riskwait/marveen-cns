"""A single record of a user-defined content type.

``data`` holds the field values keyed by ``FieldDefinition.key``; ``title`` is a
denormalised display label (from the type's title field) for listings.
"""
from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

ENTRY_STATUSES = ("draft", "published", "archived")


class ContentEntry(BaseModel):
    __tablename__ = "content_entry"

    content_type_id: Mapped[int] = mapped_column(
        ForeignKey("content_type.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    locale: Mapped[str] = mapped_column(String(5), default="fr", index=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    seo: Mapped[dict] = mapped_column(JSON, default=dict)

    content_type = relationship("ContentType", lazy="joined")

    def is_public(self) -> bool:
        return self.status == "published"

    def to_dict(self, **kw) -> dict:
        out = super().to_dict(**kw)
        out.update(content_type_id=self.content_type_id, title=self.title,
                   status=self.status, locale=self.locale,
                   data=self.data or {}, seo=self.seo or {})
        return out
