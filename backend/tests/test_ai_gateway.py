from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from app.services import ai_gateway
from app.services.gemini_client import generate_copilot_briefing, generate_explanation


class FakeResponse:
    def __init__(self, text: str):
        self.text = text


class TestAIGateway(unittest.TestCase):
    def setUp(self) -> None:
        ai_gateway.reset_ai_gateway_state()

    def test_disabled_flag_skips_gemini_and_returns_fallback(self) -> None:
        with patch.object(ai_gateway, "ENABLE_GEMINI", False), patch.object(ai_gateway.genai, "GenerativeModel") as mock_model:
            result = generate_explanation("prompt", "fallback")

        self.assertEqual(result, "fallback")
        mock_model.assert_not_called()

    def test_successful_response_is_cached(self) -> None:
        model = MagicMock()
        model.generate_content.return_value = FakeResponse("cached output")

        with patch.object(ai_gateway, "ENABLE_GEMINI", True), patch.object(ai_gateway, "GEMINI_API_KEY", "test-key"), patch.object(ai_gateway.genai, "GenerativeModel", return_value=model):
            first = generate_explanation("same prompt", "fallback")
            second = generate_explanation("same prompt", "fallback")

        self.assertEqual(first, "cached output")
        self.assertEqual(second, "cached output")
        self.assertEqual(model.generate_content.call_count, 1)

    def test_quota_error_opens_breaker_and_skips_repeat_call(self) -> None:
        model = MagicMock()
        model.generate_content.side_effect = Exception("429 Quota exceeded for model gemini-2.5-flash")

        with patch.object(ai_gateway, "ENABLE_GEMINI", True), patch.object(ai_gateway, "GEMINI_API_KEY", "test-key"), patch.object(ai_gateway.genai, "GenerativeModel", return_value=model):
            first = generate_explanation("quota prompt", "fallback")
            second = generate_explanation("quota prompt", "fallback")

        self.assertEqual(first, "fallback")
        self.assertEqual(second, "fallback")
        self.assertEqual(model.generate_content.call_count, 1)

    def test_copilot_briefing_uses_same_gateway(self) -> None:
        model = MagicMock()
        model.generate_content.return_value = FakeResponse('{"summary":"ok","risks":[],"actions":[]}')

        with patch.object(ai_gateway, "ENABLE_GEMINI", True), patch.object(ai_gateway, "GEMINI_API_KEY", "test-key"), patch.object(ai_gateway.genai, "GenerativeModel", return_value=model):
            result = generate_copilot_briefing("briefing prompt")

        self.assertEqual(result, '{"summary":"ok","risks":[],"actions":[]}')
        self.assertEqual(model.generate_content.call_count, 1)


if __name__ == "__main__":
    unittest.main()
