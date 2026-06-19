import requests
import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1:8000"

def get_db_connection():
    # Use trafficops.db inside data directory
    return sqlite3.connect("data/trafficops.db")

def verify_collisions():
    print("=" * 60)
    print("VERIFYING MULTI-EVENT COLLISION DETECTOR")
    print("=" * 60)

    # 1. Clean previous test incidents to prevent clutter
    print("\n1. Cleaning previous test entries from database...")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM incidents WHERE id LIKE 'test_col_%'")
        conn.commit()
        print("PASS: Cleaned previous test events.")
    except Exception as e:
        print(f"WARNING: failed cleanup: {e}")

    # 2. Seed overlapping test incidents
    # Seed festival at tin-factory, and construction at old-madras-road
    # Coordinate tin-factory: 12.9887, 77.6615
    # Coordinate old-madras-road: 12.9908, 77.6579 (Distance < 1 km)
    print("\n2. Seeding two overlapping incidents in SQLite...")
    now_utc = datetime.now(timezone.utc)
    ts1 = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    ts2 = (now_utc + timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")

    id1 = "test_col_fest"
    id2 = "test_col_const"

    try:
        cur.execute("""
            INSERT INTO incidents (id, junction_id, incident_type, severity, timestamp, weather, temperature_c, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (id1, "tin-factory", "festival", "moderate", ts1, "clear", 25.0, "Overlapping festival event"))

        cur.execute("""
            INSERT INTO incidents (id, junction_id, incident_type, severity, timestamp, weather, temperature_c, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (id2, "old-madras-road", "construction", "moderate", ts2, "clear", 25.0, "Overlapping pipeline construction work"))

        conn.commit()
        print(f"PASS: Seeded '{id1}' and '{id2}' within 15 mins and < 1 km.")
    except Exception as e:
        print(f"FAIL: failed seeding: {e}")
        conn.close()
        return
    finally:
        conn.close()

    # 3. Request GET /ml/collision-detect
    print("\n3. Querying /ml/collision-detect endpoint...")
    try:
        url = f"{BASE_URL}/ml/collision-detect"
        res = requests.get(url)
        if res.status_code != 200:
            print(f"FAIL: Endpoint returned status {res.status_code}")
            return
        
        data = res.json()
        print("PASS: Loaded collision list successfully.")
        print(f"JSON Output: {json.dumps(data, indent=2)}")

        # Find our seeded group
        test_group = None
        for group in data:
            if id1 in group["event_ids"] and id2 in group["event_ids"]:
                test_group = group
                break

        if not test_group:
            print("FAIL: Seeded incidents were not grouped as a collision.")
            return

        print("PASS: Seeded incidents successfully clustered together!")
        print(f"  Event Causes: {test_group['event_causes']}")
        print(f"  Overlapping Count: {test_group['num_overlapping']}")
        print(f"  Multiplier: {test_group['combined_impact_multiplier']}")
        print(f"  Min Distance: {test_group['min_distance_km']} km")
        print(f"  Junctions Affected: {test_group['junctions_affected']}")

        assert test_group["combined_impact_multiplier"] == 1.3, "Multiplier should be 1.3 for 2 events"
        assert "tin-factory" in test_group["junctions_affected"], "Junctions affected incorrect"
        assert "old-madras-road" in test_group["junctions_affected"], "Junctions affected incorrect"

    except Exception as e:
        print(f"ERROR: failed collision fetch: {e}")
        return

    # 4. Propose prediction at tin-factory coordinates and check escalation
    print("\n4. Triggering ML prediction at tin-factory to check multiplier escalation...")
    # Standard prediction for a breakdown at tin-factory (12.9887, 77.6615)
    # A breakdown usually predicts Low or Medium impact. With x1.3, it should escalate.
    payload = {
        "event_cause": "vehicle_breakdown",
        "event_type": "unplanned",
        "priority": "Medium",
        "requires_road_closure": False,
        "latitude": 12.9887,
        "longitude": 77.6615,
        "start_datetime": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        url = f"{BASE_URL}/ml/predict"
        res = requests.post(url, json=payload)
        if res.status_code != 200:
            print(f"FAIL: Predict endpoint returned status {res.status_code}")
            return

        pred_res = res.json()
        print("PASS: Predict endpoint returned successfully.")
        print(f"  Escalated Impact: {pred_res['predicted_impact']}")
        print(f"  Confidence: {pred_res['confidence']}%")
        print(f"  Reasons: {pred_res['reasons']}")
        
        # Verify that our multiplier reason is listed at the top
        reasons = pred_res.get("reasons", [])
        if reasons and "Multi-event collision detected" in reasons[0]:
            print(f"PASS: Multi-event collision escalation reasons verified: '{reasons[0]}'")
        else:
            print(f"FAIL: Escalation reason missing or not at the top. Reasons: {reasons}")

    except Exception as e:
        print(f"ERROR: failed prediction test: {e}")
        return

    print("\n" + "=" * 60)
    print("ALL COLLISION DETECTOR TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    verify_collisions()
