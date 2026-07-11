"""Blueprint registry.

Every module exposes a blueprint that is registered here under ``/api/...``.
Add new modules to :data:`BLUEPRINTS` as they are built.
"""
from __future__ import annotations

from flask import Flask


def register_blueprints(app: Flask) -> None:
    from app.routes.auth import auth_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
