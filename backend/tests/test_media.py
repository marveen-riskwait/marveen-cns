"""Media: image upload converts to WebP with a thumbnail and correct metadata."""
from __future__ import annotations

import io

from PIL import Image


def _png_bytes(size=(120, 80), color=(140, 198, 63)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_upload_image_produces_webp(admin):
    data = {"file": (_png_bytes(), "sample.png"), "alt": "vélo vert"}
    resp = admin.post("/api/media", data=data, content_type="multipart/form-data")
    assert resp.status_code == 201
    media = resp.get_json()["data"]
    assert media["kind"] == "image"
    assert media["url"].endswith(".webp")
    assert media["thumbnail_url"]
    assert media["alt"] == "vélo vert"
    assert media["width"] == 120 and media["height"] == 80


def test_media_listing_and_soft_delete(admin):
    up = admin.post("/api/media",
                    data={"file": (_png_bytes(), "todelete.png")},
                    content_type="multipart/form-data")
    mid = up.get_json()["data"]["id"]
    assert admin.delete(f"/api/media/{mid}").status_code == 200
    # Gone from the active listing, present in trash.
    active = admin.get("/api/media?per_page=100").get_json()["items"]
    assert all(m["id"] != mid for m in active)
    trashed = admin.get("/api/media/trash?per_page=100").get_json()["items"]
    assert any(m["id"] == mid for m in trashed)
