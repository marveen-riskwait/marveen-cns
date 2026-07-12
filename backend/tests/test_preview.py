"""Draft preview: a signed token renders an unpublished page; junk is rejected."""
from __future__ import annotations


def test_preview_token_renders_draft(admin):
    created = admin.post("/api/pages",
                        json={"title": "Brouillon preview", "slug": "brouillon-preview",
                              "status": "draft"})
    pid = created.get_json()["data"]["id"]

    # Draft is not public…
    assert admin.get("/api/public/pages/brouillon-preview").status_code == 404

    # …but a minted token renders it.
    tok = admin.get(f"/api/pages/{pid}/preview").get_json()["data"]["token"]
    resp = admin.get(f"/api/public/preview?token={tok}")
    assert resp.status_code == 200
    body = resp.get_json()["data"]
    assert body["slug"] == "brouillon-preview"
    assert body["is_preview"] is True


def test_invalid_preview_token_rejected(client):
    assert client.get("/api/public/preview?token=not-a-real-token").status_code == 403
