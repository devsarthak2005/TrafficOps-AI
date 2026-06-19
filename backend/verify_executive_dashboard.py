import sys
from fastapi.testclient import TestClient

from app.main import app
from app.db import create_tables, get_cursor
from app.services import simulation_engine
from app.services import alert_service
from app.services import learning_service

client = TestClient(app)

def test_executive_dashboard_integration():
    print("Initializing Executive Dashboard Verification...")
    create_tables()

    # 1. Test Demo triggers mapping (e.g. simulating VIP Movement)
    print("\n--- Testing Demo Scenario Trigger: VIP Movement ---")
    resp_sim = client.post("/api/simulation/start", json={
        "event_type": "festival",
        "target_type": "junction",
        "target_id": "silk-board",
        "intensity": "high"
    })
    assert resp_sim.status_code == 200
    sim_data = resp_sim.json()
    print(f"Simulation started: ID {sim_data['simulation_id']}, target {sim_data['target_id']}")

    # 2. Test ML prediction integration
    print("\n--- Testing ML Prediction Flow ---")
    resp_ml = client.post("/ml/predict", json={
        "event_cause": "vip_movement",
        "event_type": "planned",
        "priority": "High",
        "requires_road_closure": True,
        "latitude": 12.9176,
        "longitude": 77.6246,
        "start_datetime": "2026-06-19T17:00:00+05:30"
    })
    assert resp_ml.status_code == 200
    ml_data = resp_ml.json()
    print(f"ML Predicted Impact: {ml_data['predicted_impact']} (Confidence: {ml_data['confidence']}%)")

    # 3. Test Alert generation based on active simulation
    print("\n--- Testing Proactive Alert Generation ---")
    resp_alerts = client.get("/api/alerts")
    assert resp_alerts.status_code == 200
    alerts = resp_alerts.json()
    active_alerts = [a for a in alerts if a["status"] == "active"]
    print(f"Generated {len(active_alerts)} active alerts.")
    for a in active_alerts[:3]:
        print(f"  [{a['severity']}] {a['title']}: {a['description']}")

    assert len(active_alerts) > 0, "Should generate alerts for active high-intensity simulation"

    # 4. Test Executive Copilot Briefing
    print("\n--- Testing AI Executive Briefing ---")
    # Build request for copilot briefing
    copilot_payload = {
        "prediction": {
            "impact_level": ml_data["predicted_impact"],
            "confidence": ml_data["confidence"]
        },
        "feature_contributions": [
            {"feature": "requires_road_closure", "contribution": 25.0},
            {"feature": "vip_movement", "contribution": 15.0}
        ],
        "resource_plan": {
            "deployment_score": 85.0,
            "officers_required": 24,
            "patrol_vehicles: ": 6,
            "patrol_vehicles": 6,
            "barricades": 12,
            "diversion_level": "Major",
            "emergency_corridor_required": True,
            "estimated_response_time": "8 mins",
            "estimated_operational_cost": 2500.0
        },
        "diversion_plan": {
            "routes": [{"id": "primary", "name": "Route B", "recommended": True}],
            "estimated_vehicles_diverted": 450,
            "estimated_delay_reduction": "42%"
        },
        "event_metadata": {
            "event_type": "planned",
            "event_cause": "vip_movement",
            "zone": "South",
            "junction": "silk-board",
            "attendance": 5000,
            "duration": 2.0,
            "start_time": "15:00"
        }
    }
    resp_copilot = client.post("/api/copilot/briefing", json=copilot_payload)
    assert resp_copilot.status_code == 200
    copilot_data = resp_copilot.json()
    print(f"Copilot Executive Summary: {copilot_data['summary']}")
    print(f"Commissioner Briefing Mode: {copilot_data['commissioner_briefing']}")
    print(f"Citizen Advisory Mode: {copilot_data['citizen_advisory']}")

    # Stop simulation
    client.post(f"/api/simulation/stop/{sim_data['simulation_id']}")

    print("\n🎉 ALL EXECUTIVE DASHBOARD WORKFLOWS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    try:
        test_executive_dashboard_integration()
    except Exception as e:
        print(f"\n❌ Verification encountered error: {e}")
        sys.exit(1)
