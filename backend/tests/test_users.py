"""Users admin: create with roles, email uniqueness, and lock-out safeguards."""
from __future__ import annotations


def test_create_user_with_role(admin):
    roles = admin.get("/api/roles").get_json()["data"]
    editor = next(r for r in roles if r["name"] == "editeur")
    resp = admin.post("/api/users", json={
        "email": "created@test.com", "password": "password123",
        "first_name": "New", "role_ids": [editor["id"]],
    })
    assert resp.status_code == 201
    assert resp.get_json()["data"]["roles"] == ["editeur"]


def test_duplicate_email_conflicts(admin):
    admin.post("/api/users", json={"email": "dup@test.com", "password": "password123"})
    dup = admin.post("/api/users", json={"email": "dup@test.com", "password": "password123"})
    assert dup.status_code == 409


def test_short_password_rejected(admin):
    resp = admin.post("/api/users", json={"email": "short@test.com", "password": "x"})
    assert resp.status_code == 422


def test_cannot_delete_self(admin):
    me = admin.get("/api/auth/me").get_json()["user"]
    resp = admin.delete(f"/api/users/{me['id']}")
    assert resp.status_code == 409


def test_cannot_demote_last_superadmin(admin):
    me = admin.get("/api/auth/me").get_json()["user"]
    resp = admin.patch(f"/api/users/{me['id']}", json={"is_superadmin": False})
    assert resp.status_code == 409
