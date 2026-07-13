"""Page Builder block validation (app.services.blocks.validate_blocks)."""
from __future__ import annotations

import pytest
from marshmallow import ValidationError

from app.services.blocks import validate_blocks


def test_valid_hero_and_text():
    blocks = [
        {"type": "hero", "data": {"title": "Bienvenue", "subtitle": "Sous-titre"}},
        {"type": "text", "data": {"html": "<p>Bonjour</p>"}},
    ]
    cleaned = validate_blocks(blocks)
    assert cleaned[0]["type"] == "hero"
    assert cleaned[0]["data"]["title"] == "Bienvenue"


def test_unknown_type_rejected():
    with pytest.raises(ValidationError):
        validate_blocks([{"type": "nope", "data": {}}])


def test_missing_type_rejected():
    with pytest.raises(ValidationError):
        validate_blocks([{"data": {"title": "x"}}])


def test_hero_requires_title():
    with pytest.raises(ValidationError):
        validate_blocks([{"type": "hero", "data": {"subtitle": "no title"}}])


def test_flexible_block_passes_through():
    # 'gallery' has no strict schema -> its dict passes through.
    cleaned = validate_blocks([{"type": "gallery", "data": {"images": ["/a.webp"]}}])
    assert cleaned[0]["data"]["images"] == ["/a.webp"]


def test_blocks_must_be_a_list():
    with pytest.raises(ValidationError):
        validate_blocks({"type": "hero"})


def test_block_active_flag_preserved():
    cleaned = validate_blocks([
        {"type": "text", "data": {"html": "<p>on</p>"}},                 # default -> active
        {"type": "text", "data": {"html": "<p>off</p>"}, "active": False},
    ])
    assert cleaned[0]["active"] is True
    assert cleaned[1]["active"] is False


def test_image_block_accepts_link():
    cleaned = validate_blocks([{
        "type": "image",
        "data": {"src": "/media/x.webp", "link": "/nos-velos", "link_new_tab": True},
    }])
    assert cleaned[0]["data"]["link"] == "/nos-velos"
    assert cleaned[0]["data"]["link_new_tab"] is True


def test_text_block_html_is_sanitized():
    cleaned = validate_blocks([{
        "type": "text",
        "data": {"html": '<p>ok</p><script>alert(1)</script><a href="/x" onclick="evil()">l</a>'},
    }])
    html = cleaned[0]["data"]["html"]
    assert "<script>" not in html
    assert "onclick" not in html
    assert "<p>ok</p>" in html
    assert '<a href="/x">l</a>' in html
