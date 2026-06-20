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
from app.services.simulation_engine import start_simulation, stop_simulation
from app.schemas.simulation import SimulationRequest

# Mock compute_health_score in hospital_reachability to ensure clean test state
import app.services.hospital_reachability as hr
from app.services.health_score import derive_risk_category

def mock_compute_health_score(junction_id: str, include_simulated: bool = False, now=None) -> dict:
    score = 100.0
    if include_simulated:
        from app.services.simulation_engine import get_simulation_overrides
        overrides = get_simulation_overrides()
        if junction_id in overrides:
            score -= overrides[junction_id]
            
    health_score = max(0, min(100, round(score)))
    return {
        "health_score": health_score,
        "risk_category": derive_risk_category(health_score)
    }

# Apply the patch
hr.compute_health_score = mock_compute_health_score

client = TestClient(app)

def verify_reachability():
    print("=" * 60)
    print("VERIFYING CONGESTION-AWARE HOSPITAL REACHABILITY")
    print("=" * 60)

    # 1. Test Haversine distance calculation directly
    # Coordinates of Victoria Hospital: 12.9634, 77.5855
    # Coordinates of silk-board: 12.9176, 77.6229 (approx 6.51 km)
    dist = hr.haversine_distance(12.9634, 77.5855, 12.9176, 77.6229)
    print(f"Haversine distance (Victoria to Silk Board): {dist:.2f} km")
    assert 6.0 <= dist <= 7.0, f"Expected distance around 6.51km, got {dist:.2f}km"
    print("PASS: Haversine distance calculation verified.")

    # 2. Query all hospitals status under normal conditions
    statuses = hr.get_all_hospitals_status(include_simulated=False)
    assert len(statuses) > 0, "No hospitals status returned"
    print(f"\nHospitals accessibility status (Normal):")
    for s in statuses:
        print(f"  - {s['hospital_name']}: Score={s['accessibility_score']}, Band={s['accessibility_band']}")
        assert s["accessibility_band"] in ("safe", "watchlist", "at_risk", "critical"), f"Unexpected band: {s['accessibility_band']}"
    print("PASS: Normal hospital reachability statuses verified.")

    # 3. Test detailed status of Victoria Hospital
    victoria_detail = hr.compute_hospital_accessibility("victoria", include_simulated=False)
    print(f"\nVictoria Hospital Access Junctions:")
    for j in victoria_detail["access_junctions"]:
        print(f"  - {j['junction_name']}: Health={j['effective_health_score']}, Penalty Contribution={j['contribution_to_penalty']}")
    
    assert len(victoria_detail["access_junctions"]) == 2, "Expected 2 nearest access junctions"
    print("PASS: Hospital access junctions re-ranking verified.")

    # 4. Trigger simulation to inject critical congestion at access junction of a hospital
    # Let's target "St. John's Medical College Hospital" (st-johns)
    st_johns_normal = hr.compute_hospital_accessibility("st-johns", include_simulated=True)
    nearest_j_id = st_johns_normal["access_junctions"][0]["junction_id"]
    nearest_j_name = st_johns_normal["access_junctions"][0]["junction_name"]
    print(f"\nSt. John's nearest access junction under normal: {nearest_j_name} ({nearest_j_id})")
    assert nearest_j_id == "silk-board", f"Expected nearest junction to be silk-board, got {nearest_j_id}"

    # Start simulation at nearest junction with Critical intensity
    print(f"Starting simulation at junction '{nearest_j_id}' to trigger critical congestion...")
    sim_req = SimulationRequest(
        event_type="water_logging",
        target_type="junction",
        target_id=nearest_j_id,
        intensity="high"
    )
    sim_res = start_simulation(sim_req)
    sim_id = sim_res.simulation_id
    print(f"Active simulation started: {sim_id}")

    try:
        # Fetch status with simulated data included
        st_johns_congested = hr.compute_hospital_accessibility("st-johns", include_simulated=True)
        print(f"\nSt. John's accessibility under Congested simulation:")
        print(f"  - Accessibility Score: {st_johns_congested['accessibility_score']} (Was: {st_johns_normal['accessibility_score']})")
        print(f"  - Accessibility Band: {st_johns_congested['accessibility_band']} (Was: {st_johns_normal['accessibility_band']})")
        print(f"  - Access Junctions:")
        for j in st_johns_congested["access_junctions"]:
            print(f"    * {j['junction_name']}: Health={j['effective_health_score']}, Penalty Contribution={j['contribution_to_penalty']}")

        # Assertions for congested state
        # The score should decrease since health score drops, speed drops to 15km/h, and travel time increases
        assert st_johns_congested["accessibility_score"] < st_johns_normal["accessibility_score"], "Accessibility score did not drop under congestion"
        assert st_johns_congested["accessibility_band"] == "at_risk", f"Expected band to degrade to at_risk, got {st_johns_congested['accessibility_band']}"
        print("PASS: Congestion-aware re-ranking and band degradation verified.")
        
    finally:
        # Clean up simulation
        stop_simulation(sim_id)
        print("\nStopped simulation.")

    # 5. Verify API endpoints via TestClient
    print("\n--- Testing Router API endpoints ---")
    
    # Get all status
    resp = client.get("/hospitals/status")
    assert resp.status_code == 200
    assert len(resp.json()) > 0
    print("PASS: GET /hospitals/status returns successfully.")

    # Get Victoria detail
    resp = client.get("/hospitals/victoria/status")
    assert resp.status_code == 200
    assert resp.json()["hospital_id"] == "victoria"
    assert "access_junctions" in resp.json()
    print("PASS: GET /hospitals/{hospital_id}/status returns successfully.")

    print("\n" + "=" * 60)
    print("ALL HOSPITAL REACHABILITY VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify_reachability()
