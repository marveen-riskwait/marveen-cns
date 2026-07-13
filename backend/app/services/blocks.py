"""Page Builder block registry.

A page's content is an ordered list of blocks stored as JSON:
``[{"type": "hero", "data": {...}}, ...]``. Only registered types are allowed;
core blocks are validated by a schema, flexible ones pass through as a dict.
Add a block type to :data:`ALLOWED_TYPES` (and optionally :data:`BLOCK_SCHEMAS`)
to support it — the frontend renderer keys off ``type``.
"""
from __future__ import annotations

from typing import Any

import bleach
from marshmallow import EXCLUDE, Schema, ValidationError, fields, post_load, validate

# Safe HTML for editor-authored rich text (the "text" block). Trusted raw HTML
# lives in the dedicated "html" block and is intentionally not sanitised here.
_ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "h2", "h3", "blockquote", "code", "pre", "span",
]
_ALLOWED_ATTRS = {"a": ["href", "title", "target", "rel"], "span": ["class"]}


def sanitize_html(html: str) -> str:
    return bleach.clean(html or "", tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)

# Every block type the builder recognises (spec §"Builder de pages").
ALLOWED_TYPES: set[str] = {
    "hero", "text", "image", "gallery", "slider", "video", "columns", "faq",
    "accordion", "quote", "cta", "cards", "partners", "testimonials", "map",
    "pdf", "html", "form", "articles", "products", "reservation",
}


class _Base(Schema):
    class Meta:
        unknown = EXCLUDE


class HeroBlock(_Base):
    title = fields.String(required=True)
    subtitle = fields.String(load_default=None, allow_none=True)
    image = fields.String(load_default=None, allow_none=True)
    cta_label = fields.String(load_default=None, allow_none=True)
    cta_url = fields.String(load_default=None, allow_none=True)


class TextBlock(_Base):
    html = fields.String(required=True)

    @post_load
    def _clean(self, data, **_):
        data["html"] = sanitize_html(data.get("html", ""))
        return data


class ImageBlock(_Base):
    src = fields.String(required=True)
    alt = fields.String(load_default="")
    caption = fields.String(load_default=None, allow_none=True)
    # Turn the image into a CTA: link anywhere (internal path or external URL).
    link = fields.String(load_default=None, allow_none=True)
    link_new_tab = fields.Boolean(load_default=False)


class QuoteBlock(_Base):
    text = fields.String(required=True)
    author = fields.String(load_default=None, allow_none=True)


class CtaBlock(_Base):
    label = fields.String(required=True)
    url = fields.String(required=True)
    style = fields.String(load_default="primary")


class VideoBlock(_Base):
    url = fields.String(required=True)
    provider = fields.String(load_default="file",
                             validate=validate.OneOf(["file", "youtube", "vimeo"]))


class HtmlBlock(_Base):
    html = fields.String(required=True)


# Blocks with a strict schema; anything else in ALLOWED_TYPES passes through.
BLOCK_SCHEMAS: dict[str, Schema] = {
    "hero": HeroBlock(),
    "text": TextBlock(),
    "image": ImageBlock(),
    "quote": QuoteBlock(),
    "cta": CtaBlock(),
    "video": VideoBlock(),
    "html": HtmlBlock(),
}


def validate_blocks(blocks: Any) -> list[dict]:
    """Validate + normalise a list of blocks, or raise ``ValidationError``."""
    if not isinstance(blocks, list):
        raise ValidationError({"blocks": "Doit être une liste de blocs."})

    cleaned: list[dict] = []
    for index, block in enumerate(blocks):
        if not isinstance(block, dict) or "type" not in block:
            raise ValidationError({"blocks": f"Bloc #{index}: champ 'type' manquant."})
        btype = block["type"]
        if btype not in ALLOWED_TYPES:
            raise ValidationError({"blocks": f"Bloc #{index}: type inconnu '{btype}'."})

        data = block.get("data") or {}
        if not isinstance(data, dict):
            raise ValidationError({"blocks": f"Bloc #{index}: 'data' doit être un objet."})

        schema = BLOCK_SCHEMAS.get(btype)
        if schema is not None:
            try:
                data = schema.load(data)
            except ValidationError as exc:
                raise ValidationError({"blocks": {str(index): exc.messages}}) from exc

        # Preserve the on/off flag (default on) so a block can be hidden
        # without being deleted; the public renderer skips inactive blocks.
        cleaned.append({"type": btype, "data": data, "active": block.get("active", True) is not False})
    return cleaned
