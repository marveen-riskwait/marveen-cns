"""Content engine routes.

- ``/api/content-types`` — manage schemas (guarded by ``content_types.*``).
- ``/api/content/<slug>`` — CRUD entries of a type (guarded by ``content.*``),
  validated dynamically against the type's fields.
- ``/api/public/content/<slug>`` — published entries for the public site.
"""
from __future__ import annotations

from flask import Blueprint, request

from app.models.content_entry import ContentEntry
from app.models.content_type import ContentType
from app.permissions.decorators import require_permission
from app.services import content_service
from app.utils.errors import APIException
from app.utils.responses import ok, paginate

content_types_bp = Blueprint("content_types", __name__)
content_bp = Blueprint("content", __name__)
public_content_bp = Blueprint("public_content", __name__)


# ── Schemas (content types) ─────────────────────────────────────────
@content_types_bp.get("")
@require_permission("content_types.view")
def list_types():
    return paginate(
        ContentType.query_active().order_by(ContentType.name),
        serialize=lambda ct: ct.to_dict(with_fields=False))


@content_types_bp.get("/<int:type_id>")
@require_permission("content_types.view")
def get_type(type_id):
    return ok(content_service.get_type_or_404(type_id).to_dict())


@content_types_bp.post("")
@require_permission("content_types.create")
def create_type():
    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        raise APIException("Le nom est requis", status_code=422)
    return ok(content_service.create_type(body).to_dict(), status=201)


@content_types_bp.patch("/<int:type_id>")
@require_permission("content_types.update")
def update_type(type_id):
    return ok(content_service.update_type(type_id, request.get_json(silent=True) or {}).to_dict())


@content_types_bp.delete("/<int:type_id>")
@require_permission("content_types.delete")
def delete_type(type_id):
    content_service.get_type_or_404(type_id).soft_delete()
    return ok(message="Type supprimé")


# ── Entries (dynamic per type) ──────────────────────────────────────
def _list_entries(ct, trashed=False):
    query = content_service.entries_query(ct, trashed=trashed)
    status = request.args.get("status")
    locale = request.args.get("locale")
    q = request.args.get("q")
    if status:
        query = query.filter(ContentEntry.status == status)
    if locale:
        query = query.filter(ContentEntry.locale == locale)
    if q:
        query = query.filter(ContentEntry.title.ilike(f"%{q}%"))
    return query.order_by(ContentEntry.created_at.desc())


@content_bp.get("/<slug>")
@require_permission("content.view")
def list_entries(slug):
    ct = content_service.get_type_by_slug(slug)
    return paginate(_list_entries(ct), serialize=lambda e: e.to_dict())


@content_bp.get("/<slug>/<int:entry_id>")
@require_permission("content.view")
def get_entry(slug, entry_id):
    ct = content_service.get_type_by_slug(slug)
    return ok(content_service.get_entry_or_404(ct, entry_id).to_dict())


@content_bp.post("/<slug>")
@require_permission("content.create")
def create_entry(slug):
    ct = content_service.get_type_by_slug(slug)
    return ok(content_service.create_entry(ct, request.get_json(silent=True) or {}).to_dict(),
              status=201)


@content_bp.patch("/<slug>/<int:entry_id>")
@require_permission("content.update")
def update_entry(slug, entry_id):
    ct = content_service.get_type_by_slug(slug)
    return ok(content_service.update_entry(ct, entry_id, request.get_json(silent=True) or {}).to_dict())


@content_bp.delete("/<slug>/<int:entry_id>")
@require_permission("content.delete")
def delete_entry(slug, entry_id):
    ct = content_service.get_type_by_slug(slug)
    content_service.get_entry_or_404(ct, entry_id).soft_delete()
    return ok(message="Entrée supprimée")


# ── Public (published entries only) ─────────────────────────────────
@public_content_bp.get("/content/<slug>")
def public_entries(slug):
    ct = content_service.get_type_by_slug(slug)
    locale = request.args.get("locale", "fr")
    query = (content_service.entries_query(ct)
             .filter(ContentEntry.status == "published", ContentEntry.locale == locale)
             .order_by(ContentEntry.created_at.desc()))
    return paginate(query, serialize=lambda e: e.to_dict())


@public_content_bp.get("/content/<slug>/<int:entry_id>")
def public_entry(slug, entry_id):
    ct = content_service.get_type_by_slug(slug)
    entry = content_service.entries_query(ct).filter(ContentEntry.id == entry_id).first()
    if entry is None or not entry.is_public():
        raise APIException("Entrée introuvable", status_code=404)
    return ok(entry.to_dict())
