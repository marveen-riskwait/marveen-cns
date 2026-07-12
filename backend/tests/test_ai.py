"""AI assistant: status gating, editorial actions, SEO, translation.

The single network boundary (ai_service._complete) is monkeypatched, so tests
never call the real API and stay deterministic.
"""
from __future__ import annotations

import pytest

from app.services import ai_service


@pytest.fixture()
def ai_ready(app, monkeypatch):
    """Configure a fake key and stub the model call."""
    app.config["ANTHROPIC_API_KEY"] = "test-key"
    monkeypatch.setattr(ai_service, "_complete",
                        lambda system, prompt, **kw: f"[AI] {prompt[-40:]}")
    yield
    app.config["ANTHROPIC_API_KEY"] = ""


def test_status_reflects_configuration(admin, app):
    app.config["ANTHROPIC_API_KEY"] = ""
    assert admin.get("/api/ai/status").get_json()["data"]["configured"] is False
    app.config["ANTHROPIC_API_KEY"] = "x"
    assert admin.get("/api/ai/status").get_json()["data"]["configured"] is True
    app.config["ANTHROPIC_API_KEY"] = ""


def test_assist_requires_auth(client):
    assert client.post("/api/ai/assist", json={"action": "improve", "text": "x"}).status_code == 401


def test_assist_returns_result(admin, ai_ready):
    resp = admin.post("/api/ai/assist", json={"action": "improve", "text": "un texte a ameliorer"})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["result"].startswith("[AI]")


def test_assist_unknown_action_422(admin, ai_ready):
    assert admin.post("/api/ai/assist", json={"action": "nope", "text": "x"}).status_code == 422


def test_assist_unconfigured_503(admin, app):
    app.config["ANTHROPIC_API_KEY"] = ""
    resp = admin.post("/api/ai/assist", json={"action": "improve", "text": "x"})
    assert resp.status_code == 503


def test_seo_description(admin, ai_ready):
    resp = admin.post("/api/ai/seo-description", json={"title": "RDV Cycles", "content": "Location de vélos"})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["result"]


def test_translate(admin, ai_ready):
    resp = admin.post("/api/ai/translate", json={"text": "Bonjour", "target": "en"})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["result"].startswith("[AI]")
