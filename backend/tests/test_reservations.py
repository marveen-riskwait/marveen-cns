"""Reservations: pricing, checkout (demo seam), payment confirmation, admin guard."""
from __future__ import annotations

import pytest


@pytest.fixture()
def fake_stripe(app):
    app.config["STRIPE_FAKE"] = True
    app.config["STRIPE_SECRET_KEY"] = ""
    yield
    app.config["STRIPE_FAKE"] = False


@pytest.fixture()
def velo_id(admin):
    """A published 'velo' entry priced at 30/day (creates the type once)."""
    types = admin.get("/api/content-types").get_json()["items"]
    if not any(t["slug"] == "velo" for t in types):
        admin.post("/api/content-types", json={
            "name": "Vélo", "slug": "velo",
            "fields": [
                {"key": "nom", "label": "Nom", "field_type": "text", "is_title": True, "required": True},
                {"key": "prix_jour", "label": "Prix/jour", "field_type": "number"},
            ]})
    entry = admin.post("/api/content/velo", json={
        "status": "published", "data": {"nom": "Test Bike", "prix_jour": 30}})
    return entry.get_json()["data"]["id"]


def _booking(velo_id, **over):
    body = {"item_id": velo_id, "start_date": "2026-08-01", "end_date": "2026-08-04",
            "customer_name": "Jean Test", "customer_email": "jean@test.com"}
    body.update(over)
    return body


def test_create_reservation_prices_and_returns_checkout(client, fake_stripe, velo_id):
    resp = client.post("/api/public/reservations", json=_booking(velo_id))
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    r = data["reservation"]
    assert r["days"] == 3
    assert r["amount_cents"] == 3 * 30 * 100      # 3 days × 30 €
    assert r["status"] == "pending"
    assert "/reservation/merci" in data["checkout_url"]   # demo checkout URL


def test_end_before_start_rejected(client, fake_stripe, velo_id):
    resp = client.post("/api/public/reservations",
                       json=_booking(velo_id, end_date="2026-07-30"))
    assert resp.status_code == 422


def test_demo_confirm_marks_paid(client, fake_stripe, velo_id):
    url = client.post("/api/public/reservations", json=_booking(velo_id)).get_json()["data"]["checkout_url"]
    session_id = url.split("session_id=")[1].split("&")[0]
    assert session_id.startswith("fake_")

    confirmed = client.post("/api/public/reservations/confirm-demo", json={"session_id": session_id})
    assert confirmed.status_code == 200
    assert confirmed.get_json()["data"]["status"] == "paid"

    # The public status endpoint reflects it.
    status = client.get(f"/api/public/reservations/{session_id}").get_json()["data"]
    assert status["status"] == "paid"


def test_admin_list_requires_permission(client):
    assert client.get("/api/reservations").status_code == 401


def test_admin_can_list_reservations(admin, fake_stripe, velo_id):
    admin.post("/api/public/reservations", json=_booking(velo_id))
    resp = admin.get("/api/reservations")
    assert resp.status_code == 200
    assert resp.get_json()["meta"]["total"] >= 1
