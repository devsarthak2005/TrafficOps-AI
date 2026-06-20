from __future__ import annotations

import logging
from ..db import get_cursor
from .hospitals import get_all_hospitals
from .hospital_reachability import haversine_distance, compute_hospital_accessibility
from .health_score import derive_risk_category
from ..schemas.prediction import TimelineStep, SimulationNoInterventionResponse

logger = logging.getLogger(__name__)

def risk_category_for_score(score: float) -> str:
    """Map a 0-100 risk score to the same risk category compute_health_score returns."""
    health_score = max(0, min(100, int(round(100.0 - score))))
    return derive_risk_category(health_score)

def simulate_no_intervention(
    junction_id: str,
    current_risk_score: float,
    duration_hours: int = 4
) -> SimulationNoInterventionResponse:
    """
    Simulates the timeline and costs of not intervening in a traffic incident at a junction.
    Calculates fuel loss, economic loss, hospital accessibility drops, and ambulance delays.
    """
    # 1. Fetch junction metadata
    with get_cursor() as cur:
        cur.execute("SELECT id, name, lat, lng, road_type FROM junctions WHERE id = ?", (junction_id,))
        row = cur.fetchone()
        
    if not row:
        raise ValueError(f"Junction not found: {junction_id}")
        
    j_name = row["name"]
    j_lat = row["lat"]
    j_lng = row["lng"]
    road_type = row["road_type"]
    
    # 2. Determine vehicles affected baseline estimate (hourly flow rate)
    road_flow_map = {
        "highway": 350,
        "arterial": 200,
        "collector": 100
    }
    baseline_hourly_flow = road_flow_map.get(road_type.lower(), 200)
    vehicles_affected_estimate = int(baseline_hourly_flow * 0.5)  # estimate active vehicles per 30-min window
    
    # 3. Find the nearest hospital to this junction via Haversine distance
    hospitals = get_all_hospitals()
    nearest_hospital = None
    min_h_dist = 9999.0
    for h in hospitals:
        dist = haversine_distance(h["lat"], h["lng"], j_lat, j_lng)
        if dist < min_h_dist:
            min_h_dist = dist
            nearest_hospital = h
            
    nearest_h_id = nearest_hospital["id"] if nearest_hospital else "victoria"
    
    # 4. Generate step-by-step timeline (every 30 mins)
    timeline: list[TimelineStep] = []
    step_risk_score = current_risk_score
    
    total_fuel_loss = 0.0
    total_economic_loss = 0.0
    max_emergency_delay = 0.0
    
    total_steps = (duration_hours * 2) + 1
    
    for k in range(total_steps):
        time_mins = k * 30
        
        # Format time label
        if time_mins == 0:
            time_label = "Start"
        elif time_mins < 60:
            time_label = f"+{time_mins} mins"
        elif time_mins % 60 == 0:
            time_label = f"+{time_mins // 60}.0 hrs"
        else:
            time_label = f"+{time_mins // 60}.5 hrs"
            
        # Saturating risk score escalation (from previous step score)
        if k > 0:
            if step_risk_score >= 70.0:
                decay_factor = 0.35
            elif step_risk_score >= 35.0:
                decay_factor = 0.20
            else:
                decay_factor = 0.12
            step_risk_score = step_risk_score + (100.0 - step_risk_score) * decay_factor
            
        # Mapped congestion class
        if step_risk_score < 35.0:
            congestion_class = "Low"
        elif step_risk_score < 70.0:
            congestion_class = "Moderate"
        elif step_risk_score < 85.0:
            congestion_class = "High"
        elif step_risk_score < 95.0:
            congestion_class = "Critical"
        else:
            congestion_class = "Gridlock"
            
        # Estimate delay per vehicle (idling time in minutes)
        minutes_delayed = round((step_risk_score / 100.0) * 45.0, 1)
        
        # Fuel and economic calculations
        fuel_loss = round(vehicles_affected_estimate * 0.15 * minutes_delayed, 2)
        economic_loss = round(fuel_loss * 102.0 + (vehicles_affected_estimate * 2.5 * minutes_delayed), 2)
        
        total_fuel_loss += fuel_loss
        total_economic_loss += economic_loss
        
        # Calculate accessibility status with explicit risk override
        risk_cat = risk_category_for_score(step_risk_score)
        reach_detail = compute_hospital_accessibility(
            nearest_h_id, 
            include_simulated=True,
            risk_override={junction_id: risk_cat}
        )
        hospital_score = reach_detail["accessibility_score"]
        
        # Ambulance travel speed scaling based on risk category / score
        if step_risk_score >= 95.0:
            projected_speed = 5.0
        elif step_risk_score >= 70.0:
            projected_speed = 15.0
        else:
            projected_speed = 30.0
            
        normal_travel_time = (min_h_dist / 30.0) * 60.0
        projected_travel_time = (min_h_dist / projected_speed) * 60.0
        emergency_delay = round(max(0.0, projected_travel_time - normal_travel_time), 1)
        
        if emergency_delay > max_emergency_delay:
            max_emergency_delay = emergency_delay
            
        timeline.append(TimelineStep(
            time_minutes=time_mins,
            time_label=time_label,
            risk_score=round(step_risk_score, 1),
            congestion_class=congestion_class,
            fuel_loss_liters=fuel_loss,
            economic_loss_inr=economic_loss,
            hospital_accessibility_score=hospital_score,
            emergency_delay_minutes=emergency_delay
        ))
        
    return SimulationNoInterventionResponse(
        junction_id=junction_id,
        junction_name=j_name,
        vehicles_affected_estimate=vehicles_affected_estimate,
        timeline=timeline,
        total_fuel_loss_liters=round(total_fuel_loss, 2),
        total_economic_loss_inr=round(total_economic_loss, 2),
        max_emergency_delay_minutes=max_emergency_delay,
        assumptions={
            "fuel_cost_per_liter_inr": 102.0,
            "avg_wage_per_minute_inr": 2.5,
            "fuel_consumption_rate_liters_per_min": 0.15,
            "baseline_hourly_flow_rate": baseline_hourly_flow,
            "source": f"Junction road class: {road_type}"
        }
    )
