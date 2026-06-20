from __future__ import annotations

import math
import logging
from typing import Any
from ..db import get_cursor
from .hospitals import get_all_hospitals
from .hospital_reachability import haversine_distance, compute_hospital_accessibility
import app.services.hospital_reachability as hr
from ..schemas.prediction import TimelineStep, SimulationNoInterventionResponse

logger = logging.getLogger(__name__)

def simulate_no_intervention(
    junction_id: str,
    current_risk_score: float,
    duration_hours: int = 4
) -> SimulationNoInterventionResponse:
    """
    Simulates the timeline and costs of not intervening in a traffic incident at a junction.
    Calculates fuel loss, economic loss, hospital accessibility drops, and ambulance delays.
    """
    # 1. Fetch junction metadata to estimate vehicle flow rate
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
    # Mapping based on road type class
    road_flow_map = {
        "highway": 350,
        "arterial": 200,
        "collector": 100
    }
    baseline_hourly_flow = road_flow_map.get(road_type.lower(), 200)
    
    # Check if we have historical incident average vehicle count as fallback / custom
    # (Since actual database has no vehicle count columns, we base it on road type)
    vehicles_affected_estimate = int(baseline_hourly_flow * 0.5) # estimate active vehicles per 30-min window
    
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
    
    original_compute_health = hr.compute_health_score
    
    # Generate timesteps: e.g. 4 hours -> 9 steps (0, 30, 60, 90, 120, 150, 180, 210, 240 mins)
    total_steps = (duration_hours * 2) + 1
    
    try:
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
                
            # Risk score escalation (from previous step score)
            if k > 0:
                if step_risk_score >= 70.0:
                    escalation = 15.0 # +15% per 30 min if currently High/Critical
                elif step_risk_score >= 35.0:
                    escalation = 8.0  # +8% per 30 min if Moderate
                else:
                    escalation = 5.0  # +5% per 30 min if Low/Healthy
                step_risk_score = min(100.0, step_risk_score + escalation)
                
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
            # Standard delay scales up to 45 mins at 100% risk score
            minutes_delayed = round((step_risk_score / 100.0) * 45.0, 1)
            
            # Fuel and economic calculations
            fuel_loss = round(vehicles_affected_estimate * 0.15 * minutes_delayed, 2)
            economic_loss = round(fuel_loss * 102.0 + (vehicles_affected_estimate * 2.5 * minutes_delayed), 2)
            
            total_fuel_loss += fuel_loss
            total_economic_loss += economic_loss
            
            # Temporary patch to compute_health_score to evaluate hospital reachability at this step
            def mock_compute_health_score(j_id: str, include_simulated: bool = False, now=None) -> dict:
                if j_id == junction_id:
                    # Invert risk score to obtain health score (where 0 health is worst)
                    h_score = max(0, min(100, round(100.0 - step_risk_score)))
                    from .health_score import derive_risk_category
                    return {
                        "health_score": h_score,
                        "risk_category": derive_risk_category(h_score)
                    }
                # Other junctions are healthy
                return {"health_score": 100, "risk_category": "healthy"}
                
            hr.compute_health_score = mock_compute_health_score
            
            # Call accessibility
            reach_detail = compute_hospital_accessibility(nearest_h_id, include_simulated=True)
            hospital_score = reach_detail["accessibility_score"]
            
            # Ambulance travel speed scaling based on risk category
            # Gridlock: 5 km/h, Critical/High: 15 km/h, Moderate/Low: 30 km/h
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
            
    finally:
        # Always restore original compute_health_score function to prevent side-effects
        hr.compute_health_score = original_compute_health
        
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
