from __future__ import annotations

import sys
import os

# Workaround for unpickling EscalationFeatureExtractor when run as __main__
try:
    backend_path = os.path.dirname(os.path.abspath(__file__))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    
    from ml.pipeline.features import EscalationFeatureExtractor
    sys.modules['__main__'].EscalationFeatureExtractor = EscalationFeatureExtractor
except Exception:
    pass

from fastapi.testclient import TestClient
from app.main import app
from app.services.no_intervention_simulator import simulate_no_intervention

client = TestClient(app)

def verify_no_intervention():
    print("=" * 60)
    print("VERIFYING NO INTERVENTION (DO NOTHING) SIMULATOR")
    print("=" * 60)

    # 1. Test direct calculation for arterial class (silk-board, starting at Critical 90)
    print("\n--- Running direct simulation for Silk Board (Critical risk) ---")
    res = simulate_no_intervention("silk-board", current_risk_score=90.0, duration_hours=4)
    
    print(f"Junction Name: {res.junction_name}")
    print(f"Flow Estimate (per 30 min): {res.vehicles_affected_estimate} vehicles")
    print(f"Total Fuel Loss: {res.total_fuel_loss_liters} liters")
    print(f"Total Economic Loss: INR {res.total_economic_loss_inr}")
    print(f"Max Emergency Delay: {res.max_emergency_delay_minutes} minutes")
    print(f"Assumptions: {res.assumptions}")
    
    # Check assertions for direct output
    assert res.junction_id == "silk-board"
    assert res.vehicles_affected_estimate == 100 # arterial hourly is 200, half-hourly is 100
    assert len(res.timeline) == 9 # 4 hours * 2 + 1 = 9 steps
    assert res.timeline[0].risk_score == 90.0
    assert res.timeline[1].risk_score == 100.0 # escalated by 15% and capped
    assert res.timeline[1].congestion_class == "Gridlock"
    assert res.total_fuel_loss_liters > 0
    assert res.total_economic_loss_inr > 0
    assert res.max_emergency_delay_minutes > 0
    print("PASS: Direct simulation calculation verified.")

    # 2. Test API Router via TestClient
    print("\n--- Testing Router API endpoints ---")
    payload = {
        "junction_id": "silk-board",
        "current_risk_score": 90.0,
        "duration_hours": 4
    }
    
    resp = client.post("/api/ml/simulate-no-intervention", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["junction_id"] == "silk-board"
    assert "timeline" in data
    assert len(data["timeline"]) == 9
    print("PASS: POST /api/ml/simulate-no-intervention returns successfully.")

    print("\n" + "=" * 60)
    print("ALL NO INTERVENTION SIMULATOR TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify_no_intervention()
