"""Abstract base model for Marveen CMS.

Every persistent model inherits from :class:`BaseModel`, which provides a
primary key, automatic UTC timestamps and **soft-delete** support (the trash /
Corbeille): rows are flagged with ``deleted_at`` instead of being physically
removed, so they can be restored or purged later.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db


def utcnow() -> datetime:
    """Timezone-aware 'now' (UTC) — use everywhere instead of datetime.utcnow()."""
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime | None) -> datetime | None:
    """Coerce a datetime read from the DB to tz-aware UTC.

    SQLite returns naive datetimes even for tz-aware columns (Postgres keeps
    the offset), so normalise before comparing with :func:`utcnow`.
    """
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class BaseModel(db.Model):
    """Abstract base: id, timestamps, soft-delete and small persistence helpers."""

    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True, index=True)

    # ── State ───────────────────────────────────────────────────────
    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    # ── Persistence helpers ─────────────────────────────────────────
    def save(self) -> "BaseModel":
        db.session.add(self)
        db.session.commit()
        return self

    def soft_delete(self) -> "BaseModel":
        """Move to trash (recoverable)."""
        self.deleted_at = utcnow()
        db.session.commit()
        return self

    def restore(self) -> "BaseModel":
        """Restore from trash."""
        self.deleted_at = None
        db.session.commit()
        return self

    def hard_delete(self) -> None:
        """Permanently remove the row."""
        db.session.delete(self)
        db.session.commit()

    # ── Serialization (schemas own the rich output; this is a fallback) ──
    def to_dict(self, *, include_deleted: bool = False) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_deleted:
            data["deleted_at"] = self.deleted_at.isoformat() if self.deleted_at else None
        return data

    # ── Query scopes (respect soft-delete) ──────────────────────────
    @classmethod
    def query_active(cls):
        """Rows not in the trash."""
        return cls.query.filter(cls.deleted_at.is_(None))

    @classmethod
    def query_trashed(cls):
        """Rows currently in the trash."""
        return cls.query.filter(cls.deleted_at.is_not(None))
