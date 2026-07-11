"""Application factory for Marveen CMS.

``create_app`` wires configuration, extensions, JWT callbacks, JSON error
handlers, blueprints and CLI commands. Modules stay decoupled: they are
registered through :func:`app.routes.register_blueprints`.
"""
from __future__ import annotations

from flask import Flask, jsonify

from app.config import Config, get_config
from app.extensions import cors, db, jwt, limiter, ma, migrate


def create_app(config_object: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    cfg = config_object or get_config()
    app.config.from_object(cfg)
    cfg.validate()
    cfg.init_dirs()

    # ── Extensions ──────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db, compare_type=True)
    jwt.init_app(app)
    ma.init_app(app)
    limiter.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    # Import models so their metadata is registered before migrations.
    from app import models  # noqa: F401

    _register_jwt_callbacks(app)

    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    from app.routes import register_blueprints
    register_blueprints(app)

    _register_cli(app)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True, "service": "marveen-cms"})

    return app


def _register_jwt_callbacks(app: Flask) -> None:
    from app.models.user import TokenBlocklist, User

    @jwt.token_in_blocklist_loader
    def _token_revoked(_header, payload) -> bool:
        return TokenBlocklist.query.filter_by(jti=payload["jti"]).first() is not None

    @jwt.user_lookup_loader
    def _load_user(_header, payload):
        sub = payload.get("sub")
        return User.query.get(int(sub)) if sub else None

    @jwt.unauthorized_loader
    def _unauthorized(_reason):
        return jsonify({"ok": False, "message": "Authentification requise"}), 401

    @jwt.invalid_token_loader
    def _invalid(_reason):
        return jsonify({"ok": False, "message": "Jeton invalide"}), 401

    @jwt.expired_token_loader
    def _expired(_header, _payload):
        return jsonify({"ok": False, "message": "Session expirée"}), 401

    @jwt.revoked_token_loader
    def _revoked(_header, _payload):
        return jsonify({"ok": False, "message": "Session révoquée"}), 401


def _register_cli(app: Flask) -> None:
    from app.seeds.initial import seed_all

    @app.cli.command("seed")
    def seed():
        """Seed permissions, roles and the super-admin account."""
        seed_all()
