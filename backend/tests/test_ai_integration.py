from __future__ import annotations

import sqlite3
import unittest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import ai_gateway


class TestAIIntegration(unittest.TestCase):
    def setUp(self) -> None:
        ai_gateway.reset_ai_gateway_state()
        self.client = TestClient(app)

    def test_copilot_endpoint_uses_fallback_when_gemini_disabled(self) -> None:
        payload = {
            "prediction": {"impact_level": "High", "confidence": 91.0},
            "feature_contributions": [
                {"feature": "requires_road_closure", "contribution": 25.0},
                {"feature": "vip_movement", "contribution": 15.0},
            ],
            "resource_plan": {
                "deployment_score": 85.0,
                "officers_required": 24,
                "patrol_vehicles": 6,
                "barricades": 12,
                "diversion_level": "Major",
                "emergency_corridor_required": True,
                "estimated_response_time": "8 mins",
                "estimated_operational_cost": 2500.0,
            },
            "event_metadata": {
                "event_type": "planned",
                "event_cause": "vip_movement",
                "zone": "South",
                "junction": "silk-board",
                "attendance": 5000,
                "duration": 2.0,
                "start_time": "15:00",
            },
        }

        with patch.object(ai_gateway, "ENABLE_GEMINI", False), patch.object(ai_gateway.genai, "GenerativeModel") as mock_model:
            response = self.client.post("/api/copilot/briefing", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["generated_by"], "fallback")
        self.assertIn("summary", body)
        mock_model.assert_not_called()

    def test_alerts_endpoint_handles_sqlite_rows_without_row_get(self) -> None:
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.executescript(
            """
            CREATE TABLE junctions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                road_type TEXT NOT NULL
            );
            CREATE TABLE incidents (
                id TEXT PRIMARY KEY,
                junction_id TEXT NOT NULL,
                incident_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                weather TEXT NOT NULL DEFAULT 'clear',
                temperature_c REAL NOT NULL DEFAULT 25.0,
                description TEXT NOT NULL DEFAULT ''
            );
            INSERT INTO junctions (id, name, lat, lng, road_type)
            VALUES ('silk-board', 'Silk Board Junction', 12.9176, 77.6229, 'arterial');
            INSERT INTO incidents (id, junction_id, incident_type, severity, timestamp, description)
            VALUES ('inc-1', 'silk-board', 'congestion', 'high', '2026-06-19T10:00:00Z', 'Closure at junction');
            """
        )

        @contextmanager
        def cursor_ctx():
            cur = conn.cursor()
            try:
                yield cur
            finally:
                conn.commit()

        predictor_stub = MagicMock()
        predictor_stub.is_loaded_escalation = True
        predictor_stub.predict_escalation.return_value = {"will_escalate": True, "confidence": 0.91}

        try:
            with (
                patch("app.services.alert_engine.get_cursor", cursor_ctx),
                patch("app.services.alert_engine.generate_explanation", side_effect=lambda prompt, fallback: fallback),
                patch("app.services.alert_engine.detect_hospital_corridor_alerts", return_value=[]),
                patch("app.services.alert_engine.detect_officer_deficit_alerts", return_value=[]),
                patch("app.services.alert_engine.detect_event_readiness_alerts", return_value=[]),
                patch("app.services.alert_engine.detect_incident_spread_alerts", return_value=[]),
                patch("app.services.predictor.predictor_service", predictor_stub),
                patch.object(ai_gateway, "ENABLE_GEMINI", False),
            ):
                response = self.client.get("/alerts/active")
        finally:
            conn.close()

        self.assertEqual(response.status_code, 200)
        alerts = response.json()
        self.assertGreaterEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "escalation")
        self.assertIn("Silk Board Junction", alerts[0]["junction_name"])


if __name__ == "__main__":
    unittest.main()
