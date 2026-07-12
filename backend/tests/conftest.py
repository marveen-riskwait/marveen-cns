"""Shared pytest fixtures.

The app runs on the in-memory SQLite ``TestingConfig`` with a freshly seeded
schema per test session. Auth uses the same httpOnly-cookie + CSRF flow as the
real client; :class:`ApiClient` wraps a Flask test client to attach the CSRF
header on every mutating request automatically.
"""
from __future__ import annotations

import re

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db as _db
from app.seeds.initial import seed_all

ADMIN_EMAIL = "admin@marveen.cms"
ADMIN_PASSWORD = "ChangeMe123!"

_CSRF_RE = re.compile(r"csrf_access_token=([^;]+)")


def _csrf_from(response) -> str | None:
    for cookie in response.headers.getlist("Set-Cookie"):
        m = _CSRF_RE.search(cookie)
        if m:
            return m.group(1)
    return None


class ApiClient:
    """Thin wrapper: keeps the current CSRF token and injects it on writes."""

    def __init__(self, client):
        self._client = client
        self.csrf: str | None = None

    def _headers(self, method, extra):
        headers = dict(extra or {})
        if method in {"post", "put", "patch", "delete"} and self.csrf:
            headers.setdefault("X-CSRF-TOKEN", self.csrf)
        return headers

    def _call(self, method, url, *, headers=None, **kw):
        resp = getattr(self._client, method)(url, headers=self._headers(method, headers), **kw)
        token = _csrf_from(resp)
        if token:
            self.csrf = token
        return resp

    def get(self, url, **kw):
        return self._call("get", url, **kw)

    def post(self, url, **kw):
        return self._call("post", url, **kw)

    def put(self, url, **kw):
        return self._call("put", url, **kw)

    def patch(self, url, **kw):
        return self._call("patch", url, **kw)

    def delete(self, url, **kw):
        return self._call("delete", url, **kw)

    def login(self, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
        resp = self.post("/api/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, resp.get_json()
        return self


@pytest.fixture(scope="session")
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        _db.create_all()
        seed_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def db(app):
    """Roll back any changes a test makes, keeping the seeded baseline clean."""
    yield _db
    _db.session.rollback()


@pytest.fixture()
def client(app):
    """Anonymous API client."""
    return ApiClient(app.test_client())


@pytest.fixture()
def admin(app):
    """API client authenticated as the seeded super-admin."""
    return ApiClient(app.test_client()).login()
