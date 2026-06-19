import unittest
from fastapi import HTTPException
from app.services.predictor import PredictorService
from app.schemas.prediction import EventCause, EventType

class TestPredictorDirectly(unittest.TestCase):
    def setUp(self):
        self.predictor = PredictorService()

    def test_severity_prediction_success(self):
        # Test valid input for severity
        request_data = {
            "event_cause": EventCause.vip_movement.value,
            "event_type": EventType.planned.value,
            "priority": "High",
            "requires_road_closure": True,
            "latitude": 12.9176,
            "longitude": 77.6246,
            "start_datetime": "2026-06-19T17:00:00+05:30"
        }
        res = self.predictor.predict(request_data)
        self.assertIn("predicted_impact", res)
        self.assertIn("confidence", res)
        self.assertIn("reasons", res)
        self.assertIn("explanation", res)
        print("Severity prediction output:", res["predicted_impact"], f"({res['confidence']}%)")

    def test_recovery_time_prediction_success(self):
        # Test valid input for recovery time
        request_data = {
            "event_cause": EventCause.vehicle_breakdown.value,
            "event_type": EventType.unplanned.value,
            "priority": "Low",
            "requires_road_closure": False,
            "latitude": 12.9556,
            "longitude": 77.5857,
            "start_datetime": "2026-06-19T17:00:00+05:30"
        }
        duration = self.predictor.predict_recovery_time(request_data)
        self.assertIsInstance(duration, int)
        self.assertGreaterEqual(duration, 0)
        print("Recovery time prediction output:", duration, "minutes")

    def test_predictor_not_loaded_raises_http_exception(self):
        # Temporarily set is_loaded to False to simulate loading failure
        self.predictor.is_loaded = False
        with self.assertRaises(HTTPException) as context:
            self.predictor.predict({})
        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "Prediction model unavailable")
        
        self.predictor.is_loaded_recovery = False
        with self.assertRaises(HTTPException) as context:
            self.predictor.predict_recovery_time({})
        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "Prediction model unavailable")

if __name__ == "__main__":
    unittest.main()
