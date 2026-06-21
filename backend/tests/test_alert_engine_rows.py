from __future__ import annotations

import sqlite3
import unittest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from app.services import alert_engine


class TestAlertEngineRows(unittest.TestCase):
    def test_detect_escalation_alerts_accepts_sqlite_rows(self) -> None:
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
                patch("app.services.predictor.predictor_service", predictor_stub),
            ):
                with cursor_ctx() as cur:
                    cur.execute("SELECT id, name, lat, lng, road_type FROM junctions")
                    junction_rows = cur.fetchall()

                alerts = alert_engine.detect_escalation_alerts(junction_rows, {"silk-board": "Silk Board Junction"})
        finally:
            conn.close()

        self.assertGreaterEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["junction_id"], "silk-board")
        self.assertIn("Silk Board Junction", alerts[0]["junction_name"])


if __name__ == "__main__":
    unittest.main()
