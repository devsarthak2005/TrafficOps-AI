import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestMLEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_predict_congestion_impact(self):
        payload = {
            "event_cause": "accident",
            "event_type": "unplanned",
            "priority": "High",
            "requires_road_closure": True,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "start_datetime": "2026-06-21T12:00:00+05:30"
        }
        res = self.client.post("/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("predicted_impact", res.json())

    def test_predict_recovery_time(self):
        payload = {
            "event_cause": "vehicle_breakdown",
            "event_type": "unplanned",
            "priority": "Low",
            "requires_road_closure": False,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "zone": "Central",
            "corridor": "main_corridor",
            "junction": "silk-board",
            "start_datetime": "2026-06-21T12:00:00+05:30"
        }
        res = self.client.post("/ml/recovery-time", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("duration_minutes", res.json())

    def test_predict_escalation_risk(self):
        payload = {
            "event_cause": "vehicle_breakdown",
            "event_type": "unplanned",
            "priority": "Low",
            "requires_road_closure": False,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "zone": "Central",
            "junction": "silk-board",
            "start_datetime": "2026-06-21T12:00:00+05:30"
        }
        res = self.client.post("/ml/escalation-risk", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("will_escalate", res.json())

    def test_predict_zone_risk(self):
        payload = {
            "zone": "South",
            "junction": "silk-board",
            "event_type": "planned",
            "priority": "High",
            "severity": "High",
            "escalation_risk": 0.8,
            "historical_frequency": 5,
            "recovery_time": 90.0
        }
        res = self.client.post("/ml/zone-risk", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("risk_heatmap_color", data)

if __name__ == "__main__":
    unittest.main()
