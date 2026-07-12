"""Content engine: build a type, then create/validate/list entries + public read."""
from __future__ import annotations

import itertools

import pytest

_counter = itertools.count(1)


@pytest.fixture()
def velo_type(admin):
    """A 'Vélo' content type with a unique slug per test (committed data persists)."""
    slug = f"velo-{next(_counter)}"
    body = {
        "name": "Vélo", "slug": slug, "icon": "bi-bicycle",
        "fields": [
            {"key": "nom", "label": "Nom", "field_type": "text", "required": True, "is_title": True},
            {"key": "prix", "label": "Prix", "field_type": "number"},
            {"key": "electrique", "label": "Électrique", "field_type": "boolean"},
            {"key": "categorie", "label": "Catégorie", "field_type": "select",
             "config": {"options": [{"value": "vtt", "label": "VTT"}, {"value": "route", "label": "Route"}]}},
        ],
    }
    return admin.post("/api/content-types", json=body).get_json()["data"]


def test_create_type_with_fields(velo_type):
    keys = [f["key"] for f in velo_type["fields"]]
    assert keys == ["nom", "prix", "electrique", "categorie"]
    assert velo_type["fields"][0]["is_title"] is True


def test_entry_crud_and_validation(admin, velo_type):
    slug = velo_type["slug"]
    # Missing required 'nom' -> 422 with field error.
    bad = admin.post(f"/api/content/{slug}", json={"data": {"prix": 100}})
    assert bad.status_code == 422
    assert "nom" in bad.get_json().get("errors", {})

    # Valid entry -> coercions applied, title derived.
    created = admin.post(f"/api/content/{slug}", json={
        "status": "published",
        "data": {"nom": "Turbo 3000", "prix": "1200", "electrique": True, "categorie": "vtt"},
    })
    assert created.status_code == 201
    entry = created.get_json()["data"]
    assert entry["title"] == "Turbo 3000"
    assert entry["data"]["prix"] == 1200          # numeric coercion
    assert entry["data"]["electrique"] is True

    # Invalid select value rejected.
    bad_select = admin.patch(f"/api/content/{slug}/{entry['id']}",
                             json={"data": {"nom": "X", "categorie": "avion"}})
    assert bad_select.status_code == 422


def test_entry_listing_and_public(admin, velo_type):
    slug = velo_type["slug"]
    admin.post(f"/api/content/{slug}", json={"status": "published", "data": {"nom": "Public Bike"}})
    admin.post(f"/api/content/{slug}", json={"status": "draft", "data": {"nom": "Secret Bike"}})

    titles = [e["title"] for e in admin.get(f"/api/content/{slug}?per_page=100").get_json()["items"]]
    assert "Public Bike" in titles and "Secret Bike" in titles

    pub_titles = [e["title"] for e in admin.get(f"/api/public/content/{slug}").get_json()["items"]]
    assert "Public Bike" in pub_titles
    assert "Secret Bike" not in pub_titles


def test_duplicate_type_slug_conflicts(admin, velo_type):
    dup = admin.post("/api/content-types", json={"name": "Vélo 2", "slug": velo_type["slug"]})
    assert dup.status_code == 409


def test_content_permissions_enforced(client):
    assert client.get("/api/content-types").status_code == 401
    assert client.get("/api/content/velo").status_code == 401
