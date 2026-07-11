"""Media library — upload, browse, update, trash, and public file serving."""
from __future__ import annotations

from flask import Blueprint, current_app, request, send_from_directory

from app.models.media import Media
from app.permissions.decorators import require_permission
from app.schemas.media import media_update_schema
from app.services import media_service
from app.services.crud_service import CRUDService
from app.utils.responses import ok, paginate

media_bp = Blueprint("media", __name__)
media_files_bp = Blueprint("media_files", __name__)

_service = CRUDService(
    Media, searchable=("original_filename", "title", "alt"),
    sortable=("created_at", "size_bytes"), filterable=("kind",),
    default_sort="-created_at",
)


def _parse_tags(raw) -> list[str] | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if str(t).strip()]
    return [t.strip() for t in str(raw).split(",") if t.strip()]


@media_bp.post("")
@require_permission("media.create")
def upload():
    media = media_service.save_upload(
        request.files.get("file"),
        alt=request.form.get("alt"),
        title=request.form.get("title"),
        tags=_parse_tags(request.form.get("tags")),
    )
    return ok(media.to_dict(), status=201)


@media_bp.get("")
@require_permission("media.view")
def list_media():
    return paginate(_service.list_query(), serialize=lambda m: m.to_dict())


@media_bp.get("/trash")
@require_permission("media.view")
def list_trash():
    return paginate(_service.list_query(trashed=True), serialize=lambda m: m.to_dict())


@media_bp.get("/<int:media_id>")
@require_permission("media.view")
def get_media(media_id):
    return ok(_service.get_or_404(media_id).to_dict())


@media_bp.patch("/<int:media_id>")
@require_permission("media.update")
def update_media(media_id):
    data = media_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    data = {k: v for k, v in data.items() if v is not None}
    return ok(_service.update(media_id, data).to_dict())


@media_bp.delete("/<int:media_id>")
@require_permission("media.delete")
def delete_media(media_id):
    _service.soft_delete(media_id)
    return ok(message="Déplacé dans la corbeille")


@media_bp.post("/<int:media_id>/restore")
@require_permission("media.update")
def restore_media(media_id):
    return ok(_service.restore(media_id).to_dict())


@media_bp.delete("/<int:media_id>/purge")
@require_permission("media.delete")
def purge_media(media_id):
    media = _service.get_or_404(media_id, trashed=True)
    media_service.delete_files(media)      # remove the physical files first
    media.hard_delete()
    return ok(message="Supprimé définitivement")


# ── Public file serving (in prod this is handled by nginx) ──────────
@media_files_bp.get("/<path:filename>")
def serve(filename):
    return send_from_directory(current_app.config["MEDIA_DIR"], filename)
