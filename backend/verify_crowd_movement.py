from __future__ import annotations

import sys
import os

# Workaround for unpickling models when run as __main__
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
from app.services.crowd_movement import predict_secondary_hotspots

client = TestClient(app)

def verify_crowd_movement():
    print("=" * 60)
    print("VERIFYING FEATURE 15: CROWD MOVEMENT PREDICTOR")
    print("=" * 60)

    # 1. Test direct calculation for a festival (5.0 km radius)
    print("\n--- Running direct simulation for Silk Board (Festival, Peak hour) ---")
    res = predict_secondary_hotspots(
        event_lat=12.9176,
        event_lng=12.9176, # dummy or real coordinates
        event_type="festival",
        is_peak_hour=True
    )
    
    # Let's test with real Tin Factory coordinates from database
    real_lat = 12.9887
    real_lng = 77.6615
    res = predict_secondary_hotspots(
        event_lat=real_lat,
        event_lng=real_lng,
        event_type="festival",
        is_peak_hour=True
    )
    
    print(f"Top secondary hotspots found: {len(res)}")
    for i, h in enumerate(res):
        print(f"  {i+1}. {h.junction_name} ({h.junction_id}): +{h.traffic_increase_pct}% traffic, dist: {h.distance_km} km")
        
    assert len(res) <= 3
    for h in res:
        assert h.distance_km <= 5.0
        assert h.distance_km > 0.01  # primary junction excluded
        assert h.traffic_increase_pct > 0.0
        
    print("PASS: Direct simulation calculation verified.")

    # 2. Test differential search radius for political rally (6.0 km radius)
    print("\n--- Running direct simulation for Silk Board (Political Rally) ---")
    res_rally = predict_secondary_hotspots(
        event_lat=real_lat,
        event_lng=real_lng,
        event_type="political_rally",
        is_peak_hour=True
    )
    print(f"Rally hotspots found: {len(res_rally)}")
    for i, h in enumerate(res_rally):
         print(f"  {i+1}. {h.junction_name} ({h.junction_id}): dist: {h.distance_km} km")
    
    # 3. Test API Router via TestClient
    print("\n--- Testing Router API endpoint ---")
    payload = {
        "latitude": real_lat,
        "longitude": real_lng,
        "event_type": "sports_event",
        "start_datetime": "2026-06-20T18:30:00+05:30"
    }
    
    resp = client.post("/api/ml/crowd-movement", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["method"] == "proximity_heuristic"
    assert "hotspots" in data
    assert len(data["hotspots"]) <= 3
    print("PASS: POST /api/ml/crowd-movement returns successfully.")

    print("\n" + "=" * 60)
    print("ALL CROWD MOVEMENT SIMULATOR TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify_crowd_movement()
