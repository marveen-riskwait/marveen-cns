"""Settings: upsert, public exposure honours is_public."""
from __future__ import annotations


def test_upsert_and_read_back(admin):
    resp = admin.put("/api/settings/site_name",
                     json={"value": "RDV Cycles", "group": "general", "is_public": True})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["value"] == "RDV Cycles"


def test_public_settings_only_exposes_public_keys(admin):
    admin.put("/api/settings/public_key", json={"value": "visible", "is_public": True})
    admin.put("/api/settings/secret_key", json={"value": "hidden", "is_public": False})

    public = admin.get("/api/public/settings").get_json()["data"]
    assert public.get("public_key") == "visible"
    assert "secret_key" not in public


def test_value_requires_field(admin):
    assert admin.put("/api/settings/x", json={}).status_code == 422
