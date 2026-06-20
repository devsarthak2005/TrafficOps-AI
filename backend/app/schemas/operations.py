from __future__ import annotations

from pydantic import BaseModel


class OptimizationRequest(BaseModel):
    impact_level: str               # e.g., 'Low', 'Medium', 'High', 'Critical'
    confidence: float               # 0.0 to 100.0
    event_type: str                 # 'planned' or 'unplanned'
    event_duration: float           # in hours
    event_attendance: int           # crowd size count
    nearby_hospitals: int           # number of nearby hospitals
    junction_criticality: float     # 0.0 to 100.0
    zone: str                       # e.g., 'Central', 'East', 'North', 'South'
    junction_id: str | None = None  # optional junction ID


class OptimizationResponse(BaseModel):
    deployment_score: int
    officers_required: int
    patrol_vehicles: int
    barricades: int
    diversion_level: str            # 'None', 'Minor', 'Major', 'Lockdown'
    emergency_corridor_required: bool
    estimated_response_time: str    # e.g., "6 minutes"
    estimated_operational_cost: int # in INR/currency units
