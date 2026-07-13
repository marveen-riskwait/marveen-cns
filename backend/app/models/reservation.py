"""Reservation model — an online booking paid via Stripe.

Self-contained: the reserved item's name and unit price are snapshotted at
creation, so pricing history is stable even if the catalogue changes. Money is
stored in integer cents.
"""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel

STATUSES = ("pending", "paid", "cancelled", "expired")


class Reservation(BaseModel):
    __tablename__ = "reservation"

    # What is reserved (a content entry, e.g. a "velo") — snapshotted.
    item_type: Mapped[str] = mapped_column(String(80), nullable=True)   # type slug
    item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    item_name: Mapped[str] = mapped_column(String(200), nullable=True)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[int] = mapped_column(Integer, default=1)

    unit_price_cents: Mapped[int] = mapped_column(Integer, default=0)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="eur")

    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(40), nullable=True)
    notes: Mapped[str] = mapped_column(String(600), nullable=True)

    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    stripe_session_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def to_dict(self, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(
            item_type=self.item_type, item_id=self.item_id, item_name=self.item_name,
            start_date=self.start_date.isoformat() if self.start_date else None,
            end_date=self.end_date.isoformat() if self.end_date else None,
            days=self.days, unit_price_cents=self.unit_price_cents,
            amount_cents=self.amount_cents, amount=round(self.amount_cents / 100, 2),
            currency=self.currency, customer_name=self.customer_name,
            customer_email=self.customer_email, customer_phone=self.customer_phone,
            notes=self.notes, status=self.status,
            paid_at=self.paid_at.isoformat() if self.paid_at else None,
        )
        return data
