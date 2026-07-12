"""Authentication flow: health, login, me, logout + token revocation."""
from __future__ import annotations


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["ok"] is True


def test_login_success_sets_cookies(client):
    resp = client.post("/api/auth/login",
                       json={"email": "admin@marveen.cms", "password": "ChangeMe123!"})
    assert resp.status_code == 200
    assert client.csrf is not None  # CSRF cookie was issued


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login",
                       json={"email": "admin@marveen.cms", "password": "nope"})
    assert resp.status_code == 401
    assert resp.get_json()["ok"] is False


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(admin):
    resp = admin.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.get_json()["user"]
    assert data["email"] == "admin@marveen.cms"
    assert data["is_superadmin"] is True


def test_logout_revokes_session(admin):
    assert admin.post("/api/auth/logout").status_code == 200
    # After logout the access cookie is cleared / revoked.
    assert admin.get("/api/auth/me").status_code == 401
