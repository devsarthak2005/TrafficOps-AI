from __future__ import annotations

from typing import Dict, Any
from ..schemas.operations import OptimizationRequest, OptimizationResponse


def optimize_resource_allocation(req: OptimizationRequest) -> OptimizationResponse:
    """
    Computes a deployment score (0-100) and optimizes resources (officers, vehicles, barricades,
    diversion level, corridors, and operational costs) using input metrics.
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
    # Scale confidence (0-100) to 0-15
    confidence_pts = (req.confidence / 100.0) * 15.0

    # 3. Attendance points (max 20)
    # Benchmark attendance size at 10,000 for max points
    attendance_pts = min(req.event_attendance, 10000) / 10000.0 * 20.0

    # 4. Duration points (max 10)
    # Benchmark duration at 12 hours for max points
    duration_pts = min(req.event_duration, 12.0) / 12.0 * 10.0

    # 5. Junction Criticality points (max 10)
    # Scale criticality (0-100) to 0-10
    criticality_pts = (req.junction_criticality / 100.0) * 10.0

    # 6. Hospital Risk (max 5) - Inverse scoring
    # Fewer hospitals nearby should increase deployment requirements
    # 0 hospitals -> 5 points, 1 -> 4 points, 2 -> 3 points, 3 -> 2 points, 4 -> 1 point, >= 5 -> 0 points
    hospital_pts = max(0.0, 5.0 - float(req.nearby_hospitals))

    # 7. Zone Risk Multiplier
    zone_map = {
        "central": 1.2,
        "east": 1.2,
        "north": 1.0,
        "south": 0.8
    }
    zone_multiplier = zone_map.get(req.zone.lower(), 1.0)

    # 8. Compute Deployment Score (0-100)
    raw_score = (
        impact_pts + 
        confidence_pts + 
        attendance_pts + 
        duration_pts + 
        criticality_pts + 
        hospital_pts
    ) * zone_multiplier
    
    deployment_score = int(round(min(100.0, max(0.0, raw_score))))

    # 9. Compute Resource Allocations
    # Officer calculation
    base_officers = int(deployment_score * 0.25)
    attendance_officers = int(req.event_attendance / 400)
    planned_bonus = 4 if req.event_type.lower() == "planned" else 0
    officers = base_officers + attendance_officers + planned_bonus
    
    # Critical impact minimum rule
    if req.impact_level.lower() == "critical":
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
    barrs = base_barricades + attendance_barricades
    if req.impact_level.lower() == "critical":
        barricades = max(20, barrs)
    else:
        barricades = max(0, barrs)

    # Diversion Level mapping
    if deployment_score >= 80 or req.impact_level.lower() == "critical":
        diversion_level = "Lockdown"
    elif deployment_score >= 60 or req.impact_level.lower() == "high":
        diversion_level = "Major"
    elif deployment_score >= 30 or req.impact_level.lower() == "medium":
        diversion_level = "Minor"
    else:
        diversion_level = "None"

    # Emergency Corridor condition
    # Activate for Critical, High, or hospital-sensitive zones (e.g. nearby hospitals >= 3)
    emergency_corridor_required = (
        req.impact_level.lower() in ("critical", "high") or
        req.nearby_hospitals >= 3
    )

    # Estimated Response Time calculation
    base_time = max(4, int(22 - (deployment_score / 6)))
    if emergency_corridor_required:
        response_time = max(3, base_time - 3)
    else:
        response_time = max(4, base_time)
    
    estimated_response_time = f"{response_time} minutes"

    # Cost Model
    # Officer Cost = 2500, Vehicle Cost = 6000, Barricade Cost = 600, Setup/Base operations = 10000
    estimated_operational_cost = (
        (officers_required * 2500) +
        (patrol_vehicles * 6000) +
        (barricades * 600) +
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
