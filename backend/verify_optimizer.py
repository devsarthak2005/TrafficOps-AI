import os
import sys
import json

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Test cases
scenarios = {
    "1. Small Accident (Low Risk)": {
        "impact_level": "Low",
        "confidence": 85.0,
        "event_type": "unplanned",
        "event_duration": 0.8,
        "event_attendance": 50,
        "nearby_hospitals": 4,
        "junction_criticality": 25.0,
        "zone": "South"
    },
    "2. Festival (Medium Risk)": {
        "impact_level": "Medium",
        "confidence": 90.0,
        "event_type": "planned",
        "event_duration": 8.0,
        "event_attendance": 4000,
        "nearby_hospitals": 2,
        "junction_criticality": 60.0,
        "zone": "North"
    },
    "3. Political Rally (High Risk)": {
        "impact_level": "High",
        "confidence": 92.0,
        "event_type": "planned",
        "event_duration": 4.0,
        "event_attendance": 8000,
        "nearby_hospitals": 1,
        "junction_criticality": 85.0,
        "zone": "Central"
    },
    "4. VIP Movement (High Risk, Hospital Sensitive)": {
        "impact_level": "High",
        "confidence": 95.0,
        "event_type": "planned",
        "event_duration": 1.5,
        "event_attendance": 500,
        "nearby_hospitals": 0,
        "junction_criticality": 90.0,
        "zone": "East"
    },
    "5. Critical Public Event (Severe Risk)": {
        "impact_level": "Critical",
        "confidence": 98.0,
        "event_type": "planned",
        "event_duration": 6.0,
        "event_attendance": 12000,
        "nearby_hospitals": 1,
        "junction_criticality": 95.0,
        "zone": "Central"
    }
}

print("=" * 80)
print("RESOURCE ALLOCATION OPTIMIZATION ENGINE VERIFICATION RUN")
print("=" * 80)

for name, payload in scenarios.items():
    print(f"\nEvaluating Scenario: {name}")
    print("-" * 40)
    print(f"Inputs: {json.dumps(payload, indent=2)}")
    
    # Query optimizer endpoint
    response = client.post("/operations/optimize", json=payload)
    
    if response.status_code == 200:
        res = response.json()
        print(f"Deployment Score: {res['deployment_score']}/100")
        print(f"Officers Required: {res['officers_required']}")
        print(f"Patrol Vehicles: {res['patrol_vehicles']}")
        print(f"Barricades Required: {res['barricades']}")
        print(f"Diversion Level: {res['diversion_level']}")
        print(f"Emergency Corridor Required: {res['emergency_corridor_required']}")
        print(f"Estimated Response Time: {res['estimated_response_time']}")
        print(f"Estimated Operational Cost: INR {res['estimated_operational_cost']}")
    else:
        print(f"API Error ({response.status_code}): {response.text}")
    print("-" * 80)
