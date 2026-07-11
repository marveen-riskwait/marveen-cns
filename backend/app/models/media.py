"""Media model — an uploaded asset (image / document / video).

Images are stored as WebP with a generated thumbnail; other kinds are stored
as-is. ``url`` / ``thumbnail_url`` are public paths served under ``/media``.
"""
from __future__ import annotations

from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel

KINDS = ("image", "document", "video", "other")


class Media(BaseModel):
    __tablename__ = "media"

    filename: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # stored name
    original_filename: Mapped[str] = mapped_column(String(255), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    url: Mapped[str] = mapped_column(String(400), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(400), nullable=True)
    alt: Mapped[str] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    def to_dict(self, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(
            filename=self.filename, original_filename=self.original_filename,
            kind=self.kind, mime_type=self.mime_type, size_bytes=self.size_bytes,
            width=self.width, height=self.height, url=self.url,
            thumbnail_url=self.thumbnail_url, alt=self.alt, title=self.title,
            tags=self.tags or [],
        )
        return data
