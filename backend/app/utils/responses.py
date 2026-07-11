"""Standard API response helpers: envelopes and pagination.

Every list endpoint returns ``{"items": [...], "meta": {...}}`` and every
mutation returns ``{"ok": true, "data": ...}`` so the frontend can rely on a
single shape. Pagination reads ``?page`` / ``?per_page`` (capped by config).
"""
from __future__ import annotations

from typing import Any, Callable

from flask import current_app, jsonify, request


def ok(data: Any = None, status: int = 200, **extra: Any):
    """Success envelope for a single resource / action."""
    body: dict[str, Any] = {"ok": True}
    if data is not None:
        body["data"] = data
    body.update(extra)
    return jsonify(body), status


def paginate(query, schema=None, serialize: Callable[[Any], dict] | None = None):
    """Paginate a SQLAlchemy query into an ``items`` + ``meta`` envelope.

    Serialization order of preference: a marshmallow ``schema`` (``.dump(many)``),
    then a ``serialize`` callable, then each row's ``to_dict()``.
    """
    default = current_app.config.get("PAGINATION_DEFAULT", 20)
    maximum = current_app.config.get("PAGINATION_MAX", 100)

    page = max(request.args.get("page", 1, type=int) or 1, 1)
    per_page = request.args.get("per_page", default, type=int) or default
    per_page = min(max(per_page, 1), maximum)

    p = query.paginate(page=page, per_page=per_page, error_out=False)

    if schema is not None:
        items = schema.dump(p.items, many=True)
    elif serialize is not None:
        items = [serialize(row) for row in p.items]
    else:
        items = [row.to_dict() for row in p.items]

    return jsonify({
        "items": items,
        "meta": {
            "page": p.page, "per_page": p.per_page,
            "total": p.total, "pages": p.pages,
            "has_next": p.has_next, "has_prev": p.has_prev,
        },
    })
