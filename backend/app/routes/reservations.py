"""Reservation endpoints: public booking + Stripe webhook + admin management."""
from __future__ import annotations

from flask import Blueprint, current_app, request

from app.extensions import db, limiter
from app.models.reservation import Reservation
from app.permissions.decorators import require_permission
from app.services import reservation_service
from app.services.crud_service import CRUDService
from app.utils.errors import APIException
from app.utils.responses import ok, paginate

public_reservations_bp = Blueprint("public_reservations", __name__)
reservations_bp = Blueprint("reservations", __name__)
stripe_bp = Blueprint("stripe", __name__)

_service = CRUDService(
    Reservation,
    searchable=("customer_name", "customer_email", "item_name"),
    sortable=("created_at", "start_date", "amount_cents", "status"),
    filterable=("status", "item_type"),
    default_sort="-created_at",
)


# ── Public: create a booking, get a checkout URL ────────────────────
@public_reservations_bp.post("/reservations")
@limiter.limit("20 per hour")
def create_reservation():
    reservation, url = reservation_service.create_reservation(request.get_json(silent=True) or {})
    return ok({"reservation": reservation.to_dict(), "checkout_url": url}, status=201)


@public_reservations_bp.get("/reservations/<session_id>")
def reservation_by_session(session_id):
    """Let the success page show the booking outcome (no sensitive data)."""
    r = Reservation.query.filter_by(stripe_session_id=session_id).first()
    if r is None:
        raise APIException("Réservation introuvable", status_code=404)
    return ok({"status": r.status, "item_name": r.item_name, "amount": round(r.amount_cents / 100, 2),
               "start_date": r.start_date.isoformat(), "end_date": r.end_date.isoformat()})


@public_reservations_bp.post("/reservations/confirm-demo")
def confirm_demo():
    """Demo-mode only: simulate a successful payment (no real Stripe)."""
    if not current_app.config.get("STRIPE_FAKE"):
        raise APIException("Indisponible", status_code=404)
    session_id = (request.get_json(silent=True) or {}).get("session_id", "")
    r = reservation_service.mark_paid_by_session(session_id)
    if r is None:
        raise APIException("Session inconnue", status_code=404)
    return ok({"status": r.status})


# ── Stripe webhook (payment confirmation) ───────────────────────────
@stripe_bp.post("/webhook")
def stripe_webhook():
    reservation_service.handle_webhook(request.get_data(), request.headers.get("Stripe-Signature", ""))
    return ok(message="reçu")


# ── Admin management ────────────────────────────────────────────────
@reservations_bp.get("")
@require_permission("reservations.view")
def list_reservations():
    return paginate(_service.list_query(), serialize=lambda r: r.to_dict())


@reservations_bp.get("/<int:reservation_id>")
@require_permission("reservations.view")
def get_reservation(reservation_id):
    return ok(_service.get_or_404(reservation_id).to_dict())


@reservations_bp.patch("/<int:reservation_id>")
@require_permission("reservations.update")
def update_reservation(reservation_id):
    reservation = _service.get_or_404(reservation_id)
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in ("pending", "paid", "cancelled", "expired"):
        raise APIException("Statut invalide", status_code=422)
    reservation.status = status
    db.session.commit()
    return ok(reservation.to_dict())
