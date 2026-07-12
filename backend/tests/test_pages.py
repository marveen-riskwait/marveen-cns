"""Pages: slug uniqueness, block validation on write, and public visibility."""
from __future__ import annotations


def test_create_page_slugifies_title(admin):
    resp = admin.post("/api/pages", json={"title": "Ma Page Test"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["slug"] == "ma-page-test"


def test_duplicate_slug_conflicts(admin):
    admin.post("/api/pages", json={"title": "Unique", "slug": "unique-slug"})
    dup = admin.post("/api/pages", json={"title": "Autre", "slug": "unique-slug"})
    assert dup.status_code == 409


def test_invalid_block_rejected_on_create(admin):
    resp = admin.post("/api/pages", json={
        "title": "Avec bloc invalide",
        "blocks": [{"type": "hero", "data": {"subtitle": "pas de titre"}}],
    })
    assert resp.status_code == 422


def test_published_page_is_public_draft_is_not(admin):
    admin.post("/api/pages", json={"title": "Publique", "slug": "publique", "status": "published"})
    admin.post("/api/pages", json={"title": "Brouillon", "slug": "brouillon", "status": "draft"})

    assert admin.get("/api/public/pages/publique").status_code == 200
    assert admin.get("/api/public/pages/brouillon").status_code == 404
