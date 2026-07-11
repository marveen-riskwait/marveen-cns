"""Media metadata update schema (the binary is uploaded, not JSON-patched)."""
from __future__ import annotations

from marshmallow import EXCLUDE, Schema, fields


class MediaUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    alt = fields.String(load_default=None, allow_none=True)
    title = fields.String(load_default=None, allow_none=True)
    tags = fields.List(fields.String(), load_default=None, allow_none=True)


media_update_schema = MediaUpdateSchema()
