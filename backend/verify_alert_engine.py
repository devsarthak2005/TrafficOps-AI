import sys
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_cursor
from app.schemas.alert import AlertPayload
from app.services.alert_service import (
    get_alerts_from_db,
    save_alert_to_db,
    acknowledge_alert,
    resolve_alert,
    generate_predictive_alerts
)
from app.services import simulation_engine

client = TestClient(app)

def clear_alerts_table():
    with get_cursor() as cur:
        cur.execute("DELETE FROM alerts")

def test_alert_engine():
    print("Initializing Alert Engine Verification...")
    clear_alerts_table()

    # 1. Verify DB starts empty
    alerts = get_alerts_from_db()
    assert len(alerts) == 0, f"Expected 0 alerts in fresh DB, got {len(alerts)}"
    print("✅ Database initialized empty.")

    # 2. Mock a Medium Simulation and run generator
    print("\n--- Testing Medium Simulation alert generation ---")
    class MockSim:
        simulation_id = "sim_test_med"
        intensity = "medium"
        target_id = "silk-board"
        affected_junction_ids = ["silk-board", "bellandur"]
        event_type = "festival"

    original_get_active = simulation_engine.get_active_simulations
    simulation_engine.get_active_simulations = lambda: [MockSim()]

    generated = generate_predictive_alerts()
    print(f"Generated {len(generated)} alerts for Medium simulation.")
    for a in generated:
        print(f"  [{a.severity}] {a.title}: {a.description} (Conf: {a.confidence}%)")

    # Medium simulation should generate:
    # 1. Congestion Alert (Warning / High Impact)
    # 2. Risk Escalation Warning (Warning)
    # 3. Resource Shortage Alert (since silk-board+bellandur recommends > 8 available officers)
    # 4. Emergency Corridor Alert (since silk-board is adjacent to hospital)
    assert len(generated) >= 3, "Expected at least 3 alerts generated"

    # Verify saved in DB
    db_alerts = get_alerts_from_db()
    assert len(db_alerts) == len(generated)
    print("✅ Alerts correctly saved to DB.")

    # 3. Test filter parameters
    critical_alerts = get_alerts_from_db(severity="Critical")
    print(f"\nFiltered Critical alerts count: {len(critical_alerts)}")
    for ca in critical_alerts:
        assert ca.severity == "Critical"
    print("✅ Severity filtering works.")

    # 4. Test Acknowledge and Resolve
    target_alert = db_alerts[0]
    print(f"\nAcknowledging alert: {target_alert.alert_id}")
    ack_ok = acknowledge_alert(target_alert.alert_id)
    assert ack_ok
    updated = get_alerts_from_db(status="acknowledged")
    assert len(updated) == 1
    assert updated[0].alert_id == target_alert.alert_id
    print("✅ Acknowledge alert successful.")

    print(f"Resolving alert: {target_alert.alert_id}")
    res_ok = resolve_alert(target_alert.alert_id)
    assert res_ok
    updated_res = get_alerts_from_db(status="resolved")
    assert len(updated_res) == 1
    assert updated_res[0].alert_id == target_alert.alert_id
    print("✅ Resolve alert successful.")

    # 5. Test Router via TestClient
    print("\n--- Testing Router API endpoints ---")
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    api_alerts = resp.json()
    assert len(api_alerts) > 0
    print(f"API returned {len(api_alerts)} alerts successfully.")

    # Test ACK endpoint
    ack_target = api_alerts[1]["alert_id"]
    ack_resp = client.post("/api/alerts/acknowledge", json={"alert_id": ack_target})
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"
    print("✅ POST /api/alerts/acknowledge works.")

    # Test RESOLVE endpoint
    res_resp = client.post("/api/alerts/resolve", json={"alert_id": ack_target})
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"
    print("✅ POST /api/alerts/resolve works.")

    # Restore original mock
    simulation_engine.get_active_simulations = original_get_active
    print("\n🎉 ALL ALERT ENGINE VERIFICATION TESTS PASSED!")

if __name__ == "__main__":
    test_alert_engine()
