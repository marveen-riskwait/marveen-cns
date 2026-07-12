"""AI assistance powered by Claude (Anthropic).

Thin, testable wrapper: :func:`_complete` is the single network boundary (tests
monkeypatch it). Higher-level helpers build the prompts for editorial actions,
SEO and translation. The API key is read from config; when absent the feature
reports itself as unconfigured so the UI can hide/disable it.
"""
from __future__ import annotations

from flask import current_app

from app.utils.errors import APIException

# Editorial actions the block assistant offers.
ACTIONS = {
    "write": "Rédige un contenu clair et engageant à partir de l'instruction suivante.",
    "rewrite": "Réécris le texte suivant en améliorant le style, sans changer le sens.",
    "shorten": "Raccourcis le texte suivant en gardant l'essentiel.",
    "lengthen": "Développe le texte suivant en ajoutant des détails pertinents.",
    "improve": "Corrige et améliore l'orthographe, la grammaire et le style du texte suivant.",
    "professional": "Réécris le texte suivant sur un ton professionnel.",
    "friendly": "Réécris le texte suivant sur un ton chaleureux et accessible.",
}

_SYSTEM = (
    "Tu es un assistant de rédaction pour un CMS. Tu réponds uniquement avec le "
    "texte demandé, sans préambule ni guillemets, dans la langue du contenu fourni."
)


def is_configured() -> bool:
    return bool(current_app.config.get("ANTHROPIC_API_KEY")) or bool(current_app.config.get("AI_FAKE"))


def _require_configured() -> None:
    if not is_configured():
        raise APIException("Assistant IA non configuré (clé API manquante)", status_code=503)


def _complete(system: str, prompt: str, *, max_tokens: int | None = None) -> str:
    """Single call to Claude; returns the concatenated text output."""
    if current_app.config.get("AI_FAKE") and not current_app.config.get("ANTHROPIC_API_KEY"):
        # Deterministic demo output — no network, for dev and E2E.
        snippet = prompt.strip().splitlines()[-1][:120]
        return f"(Démo IA) {snippet}"

    from anthropic import Anthropic

    client = Anthropic(api_key=current_app.config["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model=current_app.config["AI_MODEL"],
        max_tokens=max_tokens or current_app.config["AI_MAX_TOKENS"],
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(block.text for block in message.content
                   if getattr(block, "type", None) == "text").strip()


def assist(action: str, text: str, *, context: str | None = None) -> str:
    _require_configured()
    if action not in ACTIONS:
        raise APIException(f"Action IA inconnue : {action}", status_code=422)
    if not (text or "").strip():
        raise APIException("Aucun texte à traiter", status_code=422)
    prompt = ACTIONS[action]
    if context:
        prompt += f"\n\nContexte : {context}"
    prompt += f"\n\nTexte :\n{text}"
    return _complete(_SYSTEM, prompt)


def seo_description(title: str, content: str) -> str:
    _require_configured()
    prompt = (
        "Rédige une méta-description SEO de 150 caractères maximum, percutante et "
        f"incitative, pour cette page.\n\nTitre : {title}\n\nContenu :\n{content[:2000]}")
    return _complete(_SYSTEM, prompt, max_tokens=200)


def translate(text: str, target_locale: str) -> str:
    _require_configured()
    if not (text or "").strip():
        raise APIException("Aucun texte à traduire", status_code=422)
    langs = {"fr": "français", "en": "anglais", "es": "espagnol", "de": "allemand", "it": "italien"}
    target = langs.get(target_locale, target_locale)
    prompt = f"Traduis le texte suivant en {target}, en conservant le sens et le ton :\n\n{text}"
    return _complete(_SYSTEM, prompt)
