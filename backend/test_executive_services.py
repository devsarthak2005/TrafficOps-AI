import sys
from app.db import create_tables
from app.schemas.copilot import CopilotBriefingRequest, PredictionData, FeatureContribution, ResourcePlanData, DiversionPlanData, EventMetadataData
from app.services.traffic_commander import generate_executive_briefing
from app.services.alert_service import generate_predictive_alerts
from app.services.simulation_engine import start_simulation
from app.schemas.simulation import SimulationRequest

def test_executive_services():
    print("Initializing Direct Executive Services Verification...")
    create_tables()

    # 1. Test simulation creation
    print("\n--- Testing start_simulation service ---")
    sim = start_simulation(SimulationRequest(
        event_type="festival",
        target_type="junction",
        target_id="silk-board",
        intensity="high"
    ))
    print(f"Simulation active: ID {sim.simulation_id}, target {sim.target_id}, affected junctions {sim.affected_junction_ids}")
    assert sim.target_id == "silk-board"

    # 2. Test alert generation
    print("\n--- Testing generate_predictive_alerts service ---")
    alerts = generate_predictive_alerts()
    print(f"Generated {len(alerts)} alerts.")
    for a in alerts:
        print(f"  [{a.severity}] {a.title}: {a.description}")
    assert len(alerts) > 0

    # 3. Test copilot executive briefing
    print("\n--- Testing generate_executive_briefing service ---")
    req = CopilotBriefingRequest(
        prediction=PredictionData(impact_level="Critical", confidence=91.0),
        feature_contributions=[
            FeatureContribution(feature="requires_road_closure", contribution=25.0),
            FeatureContribution(feature="vip_movement", contribution=15.0)
        ],
        resource_plan=ResourcePlanData(
            deployment_score=85.0,
            officers_required=24,
            patrol_vehicles=6,
            barricades=12,
            diversion_level="Major",
            emergency_corridor_required=True,
            estimated_response_time="8 mins",
            estimated_operational_cost=2500.0
        ),
        diversion_plan=DiversionPlanData(
            routes=[{"id": "primary", "name": "Route B", "recommended": True}],
            estimated_vehicles_diverted=450,
            estimated_delay_reduction="42%"
        ),
        event_metadata=EventMetadataData(
            event_type="planned",
            event_cause="vip_movement",
            zone="South",
            junction="silk-board",
            attendance=5000,
            duration=2.0,
            start_time="15:00"
        )
    )
    briefing = generate_executive_briefing(req)
    print(f"Copilot Summary: {briefing.summary}")
    print(f"Commissioner: {briefing.commissioner_briefing}")
    print(f"Citizen: {briefing.citizen_advisory}")
    assert briefing.summary
    assert briefing.commissioner_briefing

    print("\n🎉 ALL DIRECT SERVICE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_executive_services()
