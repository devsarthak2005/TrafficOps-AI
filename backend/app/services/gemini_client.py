from __future__ import annotations

from .ai_gateway import request_gemini_text


def generate_explanation(prompt: str, fallback: str) -> str:
    """Generate a short explanation using Gemini when available."""
    text = request_gemini_text(
        prompt,
        task_name="alert_explanation",
        max_output_tokens=100,
        temperature=0.7,
        timeout_seconds=5.0,
    )
    return text or fallback


def generate_copilot_briefing(prompt: str) -> str | None:
    """Generate a JSON briefing using Gemini when available."""
    return request_gemini_text(
        prompt,
        task_name="executive_briefing",
        max_output_tokens=600,
        temperature=0.2,
        response_mime_type="application/json",
        timeout_seconds=10.0,
    )
