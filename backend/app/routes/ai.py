"""AI assistant endpoints (Claude). Any authenticated admin may use them.

The heavy lifting is in ``ai_service``; routes stay thin and validate input.
``GET /api/ai/status`` lets the UI show or hide AI affordances.
"""
from __future__ import annotations

from flask import Blueprint, request

from app.permissions.decorators import login_required
from app.services import ai_service
from app.utils.errors import APIException
from app.utils.responses import ok

ai_bp = Blueprint("ai", __name__)


@ai_bp.get("/status")
@login_required
def status():
    return ok({"configured": ai_service.is_configured()})


@ai_bp.post("/assist")
@login_required
def assist():
    body = request.get_json(silent=True) or {}
    result = ai_service.assist(
        body.get("action", ""), body.get("text", ""), context=body.get("context"))
    return ok({"result": result})


@ai_bp.post("/seo-description")
@login_required
def seo_description():
    body = request.get_json(silent=True) or {}
    title = body.get("title", "")
    if not title.strip():
        raise APIException("Un titre est requis", status_code=422)
    return ok({"result": ai_service.seo_description(title, body.get("content", ""))})


@ai_bp.post("/translate")
@login_required
def translate():
    body = request.get_json(silent=True) or {}
    return ok({"result": ai_service.translate(body.get("text", ""), body.get("target", "en"))})
