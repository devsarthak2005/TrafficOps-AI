from __future__ import annotations

import logging
# pyrefly: ignore [missing-import]
import google.generativeai as genai
from ..config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Configure the SDK if API key is provided
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API successfully configured.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini SDK: {e}")
else:
    logger.warning("GEMINI_API_KEY is not set. Gemini client will use fallback templates.")


def generate_explanation(prompt: str, fallback: str) -> str:
    """Generate a short, natural-language explanation of an alert using Gemini 2.0 Flash.

    Falls back to a standard template string if Gemini is unconfigured, errors, or times out.
    """
    if not GEMINI_API_KEY:
        return fallback

    try:
        # Using gemini-2.0-flash as the cheap, fast model
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=100,
                temperature=0.7,
            ),
            request_options={"timeout": 5.0}  # Enforce a strict 5-second timeout
        )
        
        text = response.text.strip()
        if text:
            # Replace any double quotes or formatting to keep it a clean sentence
            cleaned = text.replace('"', '').replace('\n', ' ')
            return cleaned
    except Exception as e:
        logger.error(f"Gemini API call failed or timed out: {e}. Using fallback.")
    
    return fallback


def generate_copilot_briefing(prompt: str) -> str | None:
    """Query Gemini 2.0 Flash to generate a structured JSON briefing."""
    if not GEMINI_API_KEY:
        return None

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=600,
                temperature=0.2,
                response_mime_type="application/json"
            ),
            request_options={"timeout": 10.0}
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini briefing generation failed: {e}")
        # Try without response_mime_type in case old package version
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=600,
                    temperature=0.2
                ),
                request_options={"timeout": 10.0}
            )
            return response.text.strip()
        except Exception as ex:
            logger.error(f"Fallback Gemini briefing generation failed: {ex}")
            return None

