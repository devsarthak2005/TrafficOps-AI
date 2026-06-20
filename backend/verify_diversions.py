import requests
import json

BASE_URL = "http://127.0.0.1:8000"

scenarios = [
    {
        "name": "Low Impact Scenario",
        "payload": {
            "event_location": "silk-board",
            "predicted_impact_level": "Low",
            "deployment_score": 40,
            "event_severity": "Low",
            "event_attendance": 500
        },
        "expected_routes": 0
    },
    {
        "name": "Medium Impact Scenario",
        "payload": {
            "event_location": "silk-board",
            "predicted_impact_level": "Medium",
            "deployment_score": 60,
            "event_severity": "Medium",
            "event_attendance": 1200
        },
        "expected_routes": 1
    },
    {
        "name": "High Impact Scenario",
        "payload": {
            "event_location": "silk-board",
            "predicted_impact_level": "High",
            "deployment_score": 75,
            "event_severity": "High",
            "event_attendance": 3500
        },
        "expected_routes": 3
    },
    {
        "name": "Critical Impact Scenario",
        "payload": {
            "event_location": "silk-board",
            "predicted_impact_level": "Critical",
            "deployment_score": 90,
            "event_severity": "Critical",
            "event_attendance": 8000
        },
        "expected_routes": 4
    }
]

def run_tests():
    print("=" * 60)
    print("RUNNING AI DIVERSION PLANNER SCENARIO TESTS")
    print("=" * 60)
    
    all_passed = True
    for s in scenarios:
        name = s["name"]
        payload = s["payload"]
        expected = s["expected_routes"]
        
        print(f"\n--- Running: {name} ---")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        try:
            url = f"{BASE_URL}/api/diversions/generate"
            response = requests.post(url, json=payload)
            if response.status_code != 200:
                print(f"FAIL: Status code {response.status_code}")
                print(response.text)
                all_passed = False
                continue
                
            data = response.json()
            routes = data.get("routes", [])
            num_routes = len(routes)
            
            print(f"Response status: {response.status_code}")
            print(f"Generated routes: {num_routes} (Expected: {expected})")
            print(f"Estimated Vehicles Diverted: {data.get('estimated_vehicles_diverted')}")
            print(f"Estimated Delay Reduction: {data.get('estimated_delay_reduction')}")
            print(f"Diversion Required: {data.get('diversion_required')}")
            
            if num_routes != expected:
                print(f"FAIL: Expected {expected} routes but got {num_routes}")
                all_passed = False
                
            if num_routes > 0:
                recommended_count = sum(1 for r in routes if r.get("recommended"))
                print(f"Recommended routes count: {recommended_count} (Expected: 1)")
                if recommended_count != 1:
                    print(f"FAIL: Expected exactly 1 recommended route, got {recommended_count}")
                    all_passed = False
                
                # Check properties
                for r in routes:
                    print(f"  - Route '{r['name']}' ({r['id']}):")
                    print(f"    Distance: {r['distance']}, Travel Time: {r['travel_time']}")
                    print(f"    Congestion Score: {r['congestion_score']}, Route Score: {r['route_score']}")
                    print(f"    Recommended: {r['recommended']}")
                    
                    if not r.get("distance") or not r.get("travel_time"):
                        print("FAIL: Missing distance/travel_time metrics")
                        all_passed = False
                        
                    if r.get("congestion_score") is None or r.get("route_score") is None:
                        print("FAIL: Missing congestion_score/route_score")
                        all_passed = False
            
        except Exception as e:
            print(f"ERROR querying endpoint: {e}")
            all_passed = False
            
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED SUCCESSFULLY!")
    else:
        print("SOME TESTS FAILED! PLEASE CHECK THE ERRORS ABOVE.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
