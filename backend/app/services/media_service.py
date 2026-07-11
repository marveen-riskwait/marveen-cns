"""Media domain logic: validated upload, image → WebP + thumbnail, file cleanup.

Storage layout: ``MEDIA_DIR/<kind>s/<uuid>.<ext>`` served publicly under
``/media/...``. Images are re-encoded to WebP (with a thumbnail); SVG and other
kinds are stored as-is. Stored names are random UUIDs, so an upload can never
overwrite or escape its directory.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from flask import current_app
from PIL import Image
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.models.media import Media
from app.utils.errors import APIException

THUMB_SIZE = (400, 400)
WEBP_QUALITY = 82


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _classify(ext: str, cfg) -> tuple[str | None, bool]:
    """Return (kind, allowed). kind is None for disallowed extensions."""
    if ext in cfg["ALLOWED_IMAGE_EXTENSIONS"]:
        return "image", True
    if ext in cfg["ALLOWED_DOC_EXTENSIONS"]:
        return "document", True
    if ext in cfg["ALLOWED_VIDEO_EXTENSIONS"]:
        return "video", True
    return None, False


def _subdir(kind: str, cfg) -> Path:
    path = Path(cfg["MEDIA_DIR"]) / f"{kind}s"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload(file: FileStorage, *, alt: str | None = None,
                title: str | None = None, tags: list[str] | None = None) -> Media:
    if file is None or not file.filename:
        raise APIException("Aucun fichier fourni", status_code=422)

    cfg = current_app.config
    original = secure_filename(file.filename)
    ext = _ext(original)
    kind, allowed = _classify(ext, cfg)
    if not allowed:
        raise APIException(f"Extension non autorisée : .{ext}", status_code=422)

    subdir = _subdir(kind, cfg)
    uid = uuid.uuid4().hex
    width = height = None
    thumbnail_url = None

    if kind == "image" and ext != "svg":
        image = Image.open(file.stream)
        width, height = image.size
        image = image.convert("RGBA") if image.mode in ("RGBA", "LA", "P") \
            else image.convert("RGB")

        stored = f"{uid}.webp"
        image.save(subdir / stored, "WEBP", quality=WEBP_QUALITY)

        thumb = image.copy()
        thumb.thumbnail(THUMB_SIZE)
        thumb_name = f"{uid}_thumb.webp"
        thumb.save(subdir / thumb_name, "WEBP", quality=WEBP_QUALITY)

        thumbnail_url = f"/media/{subdir.name}/{thumb_name}"
        mime = "image/webp"
    else:
        stored = f"{uid}.{ext}" if ext else uid
        file.save(subdir / stored)
        mime = file.mimetype or None

    stored_path = subdir / stored
    media = Media(
        filename=stored, original_filename=original, kind=kind, mime_type=mime,
        size_bytes=stored_path.stat().st_size, width=width, height=height,
        url=f"/media/{subdir.name}/{stored}", thumbnail_url=thumbnail_url,
        alt=alt, title=title, tags=tags or [],
    )
    return media.save()


def delete_files(media: Media) -> None:
    """Remove a media's physical files (used on permanent deletion)."""
    media_dir = Path(current_app.config["MEDIA_DIR"])
    for url in (media.url, media.thumbnail_url):
        if url and url.startswith("/media/"):
            try:
                (media_dir / url[len("/media/"):]).unlink(missing_ok=True)
            except OSError:
                pass
