"""Menus: nested item tree round-trips; public read resolves by location."""
from __future__ import annotations


def test_nested_tree_round_trip(admin):
    tree = [
        {"label": "Accueil", "url": "/", "children": []},
        {"label": "Vélos", "url": "/velos", "children": [
            {"label": "Électriques", "url": "/velos/elec", "children": []},
        ]},
    ]
    created = admin.post("/api/menus",
                        json={"name": "Principal", "location": "header-test", "items": tree})
    assert created.status_code == 201
    mid = created.get_json()["data"]["id"]

    got = admin.get(f"/api/menus/{mid}").get_json()["data"]
    assert got["items"] == tree
    assert got["items"][1]["children"][0]["label"] == "Électriques"


def test_public_menu_by_location(admin):
    admin.post("/api/menus", json={"name": "Footer", "location": "footer-test", "items": []})
    resp = admin.get("/api/public/menus/footer-test")
    assert resp.status_code == 200
    assert resp.get_json()["data"]["name"] == "Footer"


def test_public_menu_unknown_location_404(admin):
    assert admin.get("/api/public/menus/does-not-exist").status_code == 404
