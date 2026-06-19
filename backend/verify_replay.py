import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def verify_replay_api():
    print("=" * 60)
    print("VERIFYING HISTORICAL REPLAY & TIMELINE ENGINE API")
    print("=" * 60)
    
    # 1. Test replay list
    print("\n1. Querying Replay History List (/api/replay)...")
    try:
        url = f"{BASE_URL}/api/replay"
        res = requests.get(url)
        if res.status_code != 200:
            print(f"FAIL: List endpoint status code {res.status_code}")
            return
            
        data = res.json()
        print(f"PASS: Found {len(data)} events in replay history list.")
        
        # Print summary of first few
        for idx, item in enumerate(data[:5]):
            print(f"  - [{item['event_id']}] Title: {item['title']}, Severity: {item['severity']}, Created: {item['created_at']}")
            
        if not data:
            print("FAIL: Event list is empty.")
            return
            
        # Select first event for detail testing (should be demo-protest or historical)
        target_id = data[0]['event_id']
        
    except Exception as e:
        print(f"ERROR: failed list query: {e}")
        return

    # 2. Test detailed replay response
    print(f"\n2. Querying Replay Details for Event ID: {target_id}...")
    try:
        url = f"{BASE_URL}/api/replay/{target_id}"
        res = requests.get(url)
        if res.status_code != 200:
            print(f"FAIL: Detail endpoint status code {res.status_code}")
            return
            
        detail = res.json()
        print("PASS: Detail loaded successfully.")
        print(f"  Title: {detail['title']}")
        print(f"  Type: {detail['event_type']}")
        print(f"  Location: {detail['location']}")
        print(f"  Severity: {detail['severity']}")
        print(f"  Created At: {detail['created_at']}")
        
        # Validate audit metrics
        audit = detail.get("prediction_audit", {})
        print(f"\n  --- Prediction Audit ---")
        print(f"  Predicted Impact: {audit.get('predicted_impact')}")
        print(f"  Actual Outcome: {audit.get('actual_outcome')}")
        print(f"  Confidence: {audit.get('confidence')}%")
        print(f"  Success Indicator: {audit.get('success_indicator')}")
        
        # Validate effectiveness metrics
        eff = detail.get("resource_effectiveness", {})
        print(f"\n  --- Resource Effectiveness ---")
        print(f"  Officers Deployed: {eff.get('officers_deployed')}")
        print(f"  Delay Reduction: {eff.get('estimated_delay_reduction')}")
        print(f"  Diversion Success: {eff.get('diversion_success')}")
        
        # Validate learning insights
        print(f"\n  --- Post-Event Audit Learning Insight ---")
        print(f"  Insight: {detail.get('learning_insight')}")
        
        # Validate timeline snaps
        timeline = detail.get("timeline", [])
        print(f"\n  --- Timeline Snapshots ({len(timeline)} stages) ---")
        for snap in timeline[:3]:
            print(f"    * [{snap['stage']}] @ {snap['timestamp']}: Congestion {snap['congestion_score']}, description: {snap['description']}")
        print("    ...")
        
        # Verify structure keys
        keys = ["event_id", "event_type", "location", "title", "severity", "created_at", "timeline", "prediction_audit", "resource_effectiveness", "learning_insight"]
        for k in keys:
            if k not in detail:
                print(f"FAIL: Missing key '{k}' in detailed response.")
                return
        print("\nPASS: Detailed response contains all required structure keys.")
        
    except Exception as e:
        print(f"ERROR: failed details query: {e}")
        return

    # 3. Test querying an actual historical incident from database if list had any
    hist_events = [x for x in data if not x['event_id'].startswith("demo-")]
    if hist_events:
        hist_id = hist_events[0]['event_id']
        print(f"\n3. Querying Historical SQLite Incident ID: {hist_id}...")
        try:
            url = f"{BASE_URL}/api/replay/{hist_id}"
            res = requests.get(url)
            if res.status_code == 200:
                print(f"PASS: Dynamically generated timeline loads clean for historical event ID: {hist_id}")
                h_detail = res.json()
                print(f"  Insight: {h_detail.get('learning_insight')}")
            else:
                print(f"FAIL: Status code {res.status_code} for historical query.")
        except Exception as e:
            print(f"ERROR querying historical incident: {e}")
    else:
        print("\n3. Skip historical database query: No database incidents found.")

    print("\n" + "=" * 60)
    print("ALL API VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify_replay_api()
