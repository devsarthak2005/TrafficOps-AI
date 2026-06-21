from __future__ import annotations

from typing import Dict, Any
from ..schemas.operations import OptimizationRequest, OptimizationResponse
from ..config import JUNCTION_CLASSIFICATIONS


def optimize_resource_allocation(req: OptimizationRequest) -> OptimizationResponse:
    """
    Computes a deployment score (0-100) and optimizes resources (officers, vehicles, barricades,
    diversion level, corridors, and operational costs) using input metrics and ML-predicted indicators.
    """
    # 1. Calculate base points for Impact Level (max 40)
    impact_map = {
        "critical": 40.0,
        "high": 30.0,
        "medium": 15.0,
        "low": 5.0
    }
    impact_pts = impact_map.get(req.impact_level.lower(), 5.0)

    # 2. Confidence points (max 15)
    confidence_pts = (req.confidence / 100.0) * 15.0

    # 3. Attendance points (max 20)
    attendance_pts = min(req.event_attendance, 10000) / 10000.0 * 20.0

    # 4. Duration points (max 10)
    duration_pts = min(req.event_duration, 12.0) / 12.0 * 10.0

    # 5. Junction Criticality points (max 10)
    criticality_pts = (req.junction_criticality / 100.0) * 10.0

    # 6. Hospital Risk (max 5) - Inverse scoring
    hospital_pts = max(0.0, 5.0 - float(req.nearby_hospitals))

    # 7. Zone Risk Multiplier
    zone_map = {
        "central": 1.2,
        "east": 1.2,
        "north": 1.0,
        "south": 0.8
    }
    zone_multiplier = zone_map.get(req.zone.lower(), 1.0)

    # 8. Compute Base Deployment Score (0-100)
    raw_score = (
        impact_pts + 
        confidence_pts + 
        attendance_pts + 
        duration_pts + 
        criticality_pts + 
        hospital_pts
    ) * zone_multiplier
    
    # 9. ML Escalation Risk Adjustments (Dynamic Hybrid Scaling)
    # Scale deployment score up by up to 20% if escalation risk is high/present
    # Fetch escalation risk from prediction inputs context if available
    escalation_risk_prob = getattr(req, "escalation_risk_prob", 0.0)
    if escalation_risk_prob > 0.5:
        raw_score *= (1.0 + (escalation_risk_prob - 0.5) * 0.4) # up to +20% adjustment

    # ML Recovery Time Adjustment
    # Scale up deployment if recovery time is long
    recovery_time_mins = getattr(req, "recovery_time_mins", 60)
    if recovery_time_mins > 90:
        raw_score += 10.0 # +10 severity points modifier for slow clearance cases

    deployment_score = int(round(min(100.0, max(0.0, raw_score))))

    # 10. Compute Resource Allocations using hybrid predictive logic
    # Officer calculation
    base_officers = int(deployment_score * 0.25)
    attendance_officers = int(req.event_attendance / 400)
    planned_bonus = 4 if req.event_type.lower() == "planned" else 0
    
    # Scale officers with escalation risk probability
    officers = int((base_officers + attendance_officers + planned_bonus) * (1.0 + escalation_risk_prob))
    
    if req.impact_level.lower() == "critical" or escalation_risk_prob > 0.7:
        officers_required = max(25, officers)
    else:
        officers_required = max(2, officers)

    # Patrol Vehicles calculation
    base_vehicles = max(1, int(officers_required / 3))
    if req.impact_level.lower() == "critical":
        patrol_vehicles = max(8, base_vehicles)
    else:
        patrol_vehicles = max(1, base_vehicles)

    # Barricades calculation
    base_barricades = int(deployment_score * 0.3)
    attendance_barricades = int(req.event_attendance / 800)
    
    # Long recovery time requires more barricades to seal off alternative routes
    recovery_modifier = 1.3 if recovery_time_mins > 90 else 1.0
    barrs = int((base_barricades + attendance_barricades) * recovery_modifier)
    
    if req.impact_level.lower() == "critical":
        barricades = max(20, barrs)
    else:
        barricades = max(0, barrs)

    # Volunteers recommendation
    volunteers_required = int(officers_required * 0.5) if req.event_type.lower() == "planned" else 0

    # Diversion Level mapping
    if deployment_score >= 80 or req.impact_level.lower() == "critical" or escalation_risk_prob > 0.8:
        diversion_level = "Lockdown"
    elif deployment_score >= 60 or req.impact_level.lower() == "high":
        diversion_level = "Major"
    elif deployment_score >= 30 or req.impact_level.lower() == "medium":
        diversion_level = "Minor"
    else:
        diversion_level = "None"

    # Emergency Corridor condition
    emergency_corridor_required = (
        req.impact_level.lower() in ("critical", "high") or
        req.nearby_hospitals >= 3 or
        escalation_risk_prob > 0.6
    )

    # Estimated Response Time calculation
    base_time = max(4, int(22 - (deployment_score / 6)))
    if emergency_corridor_required:
        response_time = max(3, base_time - 3)
    else:
        response_time = max(4, base_time)
    
    # Scale by road classification multiplier
    multiplier = 1.0
    if req.junction_id:
        junc_key = req.junction_id.lower().strip()
        if junc_key in JUNCTION_CLASSIFICATIONS:
            multiplier = JUNCTION_CLASSIFICATIONS[junc_key]["multiplier"]
    
    response_time = int(round(response_time * multiplier))
    if emergency_corridor_required:
        response_time = max(3, response_time)
    else:
        response_time = max(4, response_time)
    
    estimated_response_time = f"{response_time} minutes"

    # Cost Model
    estimated_operational_cost = (
        (officers_required * 2500) +
        (patrol_vehicles * 6000) +
        (barricades * 600) +
        (volunteers_required * 500) +
        10000
    )

    return OptimizationResponse(
        deployment_score=deployment_score,
        officers_required=officers_required,
        patrol_vehicles=patrol_vehicles,
        barricades=barricades,
        diversion_level=diversion_level,
        emergency_corridor_required=emergency_corridor_required,
        estimated_response_time=estimated_response_time,
        estimated_operational_cost=estimated_operational_cost
    )

