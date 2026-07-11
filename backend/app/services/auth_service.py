"""Authentication domain logic (no HTTP concerns).

Routes stay thin: they validate input and set cookies; the *what* (create a
user, verify credentials, revoke a token) lives here and is unit-testable.
"""
from __future__ import annotations

from app.extensions import db
from app.models.user import Role, TokenBlocklist, User
from app.utils.errors import APIException


def register_user(email: str, password: str, first_name: str | None = None,
                  last_name: str | None = None, roles: list[Role] | None = None,
                  is_superadmin: bool = False) -> User:
    """Create a user. Raises 409 if the email is taken."""
    email = email.strip().lower()
    if User.query.filter_by(email=email).first():
        raise APIException("Un compte existe déjà avec cet email", status_code=409)

    user = User(email=email, first_name=first_name, last_name=last_name,
                is_superadmin=is_superadmin)
    user.set_password(password)
    if roles:
        user.roles = roles
    db.session.add(user)
    db.session.commit()
    return user


def authenticate(email: str, password: str) -> User:
    """Return the user for valid credentials, else raise 401/403."""
    user = User.query.filter_by(email=email.strip().lower()).first()
    if user is None or not user.check_password(password):
        raise APIException("Email ou mot de passe incorrect", status_code=401)
    if not user.is_active or user.is_deleted:
        raise APIException("Compte désactivé", status_code=403)
    user.touch_login()
    db.session.commit()
    return user


def revoke(jwt_payload: dict) -> None:
    """Add a decoded token's jti to the blocklist (logout / refresh rotation)."""
    jti = jwt_payload["jti"]
    if not TokenBlocklist.query.filter_by(jti=jti).first():
        sub = jwt_payload.get("sub")
        db.session.add(TokenBlocklist(
            jti=jti,
            token_type=jwt_payload.get("type", "access"),
            user_id=int(sub) if sub else None,
        ))
