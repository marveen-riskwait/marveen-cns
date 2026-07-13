"""Reservation domain logic: pricing, Stripe Checkout, payment confirmation.

Stripe Checkout automatically offers cards, Apple Pay, Google Pay and eligible
local methods — we don't restrict ``payment_method_types``. A ``STRIPE_FAKE``
seam simulates the whole flow so it's testable without real keys.
"""
from __future__ import annotations

from datetime import date, datetime

from flask import current_app

from app.extensions import db
from app.models.base import utcnow
from app.models.reservation import Reservation
from app.services import content_service, settings_service
from app.utils.errors import APIException


def _cfg(key: str, default: str) -> str:
    return str(settings_service.get_all().get(key) or default)


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise APIException("Date invalide (format AAAA-MM-JJ attendu)", status_code=422)


def _resolve_item(item_id: int) -> tuple[str, str, int]:
    """Return (type_slug, name, unit_price_cents) for a reservable content entry."""
    type_slug = _cfg("reservation_type", "velo")
    price_field = _cfg("reservation_price_field", "prix_jour")
    ct = content_service.get_type_by_slug(type_slug)
    entry = content_service.get_entry_or_404(ct, item_id)
    raw_price = (entry.data or {}).get(price_field)
    try:
        unit_cents = int(round(float(raw_price) * 100))
    except (TypeError, ValueError):
        raise APIException("Cet article n'a pas de prix défini", status_code=422)
    return type_slug, entry.title or f"#{entry.id}", unit_cents


def _checkout(reservation: Reservation) -> str:
    """Create a Stripe Checkout session (or a fake one); return its URL."""
    site = current_app.config["PUBLIC_SITE_URL"].rstrip("/")
    success = f"{site}/reservation/merci?session_id={{CHECKOUT_SESSION_ID}}"
    cancel = f"{site}/reserver?annule=1"

    if current_app.config.get("STRIPE_FAKE") and not current_app.config.get("STRIPE_SECRET_KEY"):
        reservation.stripe_session_id = f"fake_{reservation.id}"
        return (f"{site}/reservation/merci?session_id={reservation.stripe_session_id}&demo=1")

    import stripe

    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success,
        cancel_url=cancel,
        customer_email=reservation.customer_email,
        client_reference_id=str(reservation.id),
        metadata={"reservation_id": str(reservation.id)},
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": reservation.currency,
                "unit_amount": reservation.amount_cents,
                "product_data": {
                    "name": f"Réservation — {reservation.item_name}",
                    "description": f"{reservation.days} jour(s) · "
                                   f"{reservation.start_date} → {reservation.end_date}",
                },
            },
        }],
    )
    reservation.stripe_session_id = session.id
    return session.url


def create_reservation(payload: dict) -> tuple[Reservation, str]:
    """Create a pending reservation and return it with its checkout URL."""
    for field in ("item_id", "start_date", "end_date", "customer_name", "customer_email"):
        if not payload.get(field):
            raise APIException(f"Champ requis manquant : {field}", status_code=422)

    start = _parse_date(payload["start_date"])
    end = _parse_date(payload["end_date"])
    days = (end - start).days
    if days < 1:
        raise APIException("La date de fin doit être après la date de début", status_code=422)

    type_slug, name, unit_cents = _resolve_item(int(payload["item_id"]))
    if unit_cents <= 0:
        raise APIException("Montant invalide pour cet article", status_code=422)

    reservation = Reservation(
        item_type=type_slug, item_id=int(payload["item_id"]), item_name=name,
        start_date=start, end_date=end, days=days,
        unit_price_cents=unit_cents, amount_cents=unit_cents * days,
        currency=current_app.config["STRIPE_CURRENCY"],
        customer_name=payload["customer_name"], customer_email=payload["customer_email"],
        customer_phone=payload.get("customer_phone"), notes=payload.get("notes"),
        status="pending",
    )
    db.session.add(reservation)
    db.session.flush()  # get an id for the checkout metadata
    url = _checkout(reservation)
    db.session.commit()
    return reservation, url


def mark_paid_by_session(session_id: str) -> Reservation | None:
    """Mark a reservation paid (idempotent). Returns it, or None if unknown."""
    reservation = Reservation.query.filter_by(stripe_session_id=session_id).first()
    if reservation is None:
        return None
    if reservation.status != "paid":
        reservation.status = "paid"
        reservation.paid_at = utcnow()
        db.session.commit()
    return reservation


def handle_webhook(payload: bytes, signature: str) -> None:
    """Verify a Stripe webhook and confirm payment on checkout completion."""
    import stripe

    secret = current_app.config["STRIPE_WEBHOOK_SECRET"]
    try:
        event = stripe.Webhook.construct_event(payload, signature, secret)
    except Exception:  # noqa: BLE001 — bad signature / malformed
        raise APIException("Signature de webhook invalide", status_code=400)

    if event["type"] == "checkout.session.completed":
        mark_paid_by_session(event["data"]["object"]["id"])
