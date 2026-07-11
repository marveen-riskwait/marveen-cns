"""JSON error handling for the API.

A single :class:`APIException` is raised across services/routes; the registered
handlers turn it — and common HTTP/validation errors — into a consistent JSON
envelope ``{"ok": false, "message": ..., ...}``.
"""
from __future__ import annotations

from typing import Any

from flask import Flask, jsonify
from marshmallow import ValidationError


class APIException(Exception):
    """Application error carrying an HTTP status and an optional payload."""

    status_code: int = 400

    def __init__(self, message: str, status_code: int | None = None,
                 payload: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload or {}

    def to_dict(self) -> dict[str, Any]:
        data = dict(self.payload)
        data["ok"] = False
        data["message"] = self.message
        return data


def register_error_handlers(app: Flask) -> None:
    """Attach JSON error handlers to the application."""

    @app.errorhandler(APIException)
    def _api_exception(exc: APIException):
        return jsonify(exc.to_dict()), exc.status_code

    @app.errorhandler(ValidationError)
    def _validation_error(exc: ValidationError):
        return jsonify({"ok": False, "message": "Validation échouée",
                        "errors": exc.messages}), 422

    @app.errorhandler(404)
    def _not_found(_):
        return jsonify({"ok": False, "message": "Ressource introuvable"}), 404

    @app.errorhandler(405)
    def _method_not_allowed(_):
        return jsonify({"ok": False, "message": "Méthode non autorisée"}), 405

    @app.errorhandler(429)
    def _rate_limited(_):
        return jsonify({"ok": False, "message": "Trop de requêtes, réessayez plus tard"}), 429

    @app.errorhandler(500)
    def _server_error(_):
        return jsonify({"ok": False, "message": "Erreur interne du serveur"}), 500
