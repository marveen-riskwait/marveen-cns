"""RBAC decorators and the current-user accessor.

Usage on a route::

    @bp.post("/pages")
    @require_permission("pages.create")
    def create_page():
        ...

Each decorator verifies the JWT (from the httpOnly cookie), loads the user and
enforces the rule, raising :class:`APIException` (401/403) otherwise.
"""
from __future__ import annotations

from functools import wraps
from typing import Callable

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.utils.errors import APIException


def current_user() -> User:
    """The authenticated, active user, or raise 401."""
    identity = get_jwt_identity()
    user = User.query.get(int(identity)) if identity is not None else None
    if user is None or not user.is_active or user.is_deleted:
        raise APIException("Session invalide ou expirée", status_code=401)
    return user


def login_required(fn: Callable) -> Callable:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user()
        return fn(*args, **kwargs)
    return wrapper


def require_permission(*codes: str, require_all: bool = True) -> Callable:
    """Require one/all of the given permission codes (superadmin always passes)."""
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if not user.is_superadmin:
                check = all if require_all else any
                if not check(user.has_permission(code) for code in codes):
                    raise APIException("Permission insuffisante", status_code=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_role(*names: str) -> Callable:
    """Require at least one of the given roles (superadmin always passes)."""
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if not user.is_superadmin and not any(user.has_role(n) for n in names):
                raise APIException("Rôle insuffisant", status_code=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
