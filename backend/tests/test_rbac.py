"""RBAC: permissions guard endpoints; a role-limited user is scoped correctly."""
from __future__ import annotations

import pytest

from app.extensions import db
from app.models.user import Role, User


@pytest.fixture()
def editor_client(app):
    """A freshly created 'editeur' user, logged in."""
    from tests.conftest import ApiClient

    with app.app_context():
        email = "editor.rbac@test.com"
        if User.query.filter_by(email=email).first() is None:
            role = Role.query.filter_by(name="editeur").first()
            u = User(email=email, first_name="Ed", is_active=True)
            u.set_password("password123")
            u.roles = [role]
            db.session.add(u)
            db.session.commit()
    return ApiClient(app.test_client()).login(email="editor.rbac@test.com", password="password123")


def test_anonymous_cannot_list_users(client):
    assert client.get("/api/users").status_code == 401


def test_editor_forbidden_on_users(editor_client):
    # 'editeur' has content perms but not users.view -> 403.
    assert editor_client.get("/api/users").status_code == 403


def test_editor_allowed_on_content(editor_client):
    assert editor_client.get("/api/faq").status_code == 200


def test_superadmin_bypasses_everything(admin):
    assert admin.get("/api/users").status_code == 200
    assert admin.get("/api/roles").status_code == 200
