"""Signed, expiring preview tokens for unpublished pages.

An editor mints a token for a page; the public site can then render that page
(even as a draft) via the preview endpoint. Tokens are stateless, signed with
``SECRET_KEY`` and time-limited — no storage, and they expire on their own.
"""
from __future__ import annotations

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

_SALT = "marveen-page-preview"


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=_SALT)


def make_preview_token(page_id: int) -> str:
    """Sign a short-lived token carrying the page id."""
    return _serializer().dumps({"page_id": int(page_id)})


def read_preview_token(token: str) -> int | None:
    """Return the page id for a valid, unexpired token, else ``None``."""
    max_age = current_app.config.get("PREVIEW_TOKEN_TTL", 3600)
    try:
        data = _serializer().loads(token, max_age=max_age)
    except (SignatureExpired, BadSignature):
        return None
    return data.get("page_id")
