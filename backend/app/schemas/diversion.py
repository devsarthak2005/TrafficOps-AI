from __future__ import annotations

from typing import List
from pydantic import BaseModel


class DiversionRequest(BaseModel):
    event_location: str                  # Junction ID (e.g. 'silk-board')
    predicted_impact_level: str          # 'Low', 'Medium', 'High', 'Critical'
    deployment_score: int                # 0-100
    event_severity: str                  # 'Low', 'Medium', 'High', 'Critical'
    event_attendance: int = 1000         # crowd size count (default to 1000 if not provided)



class RouteMetric(BaseModel):
    id: str                        # 'primary', 'secondary', 'emergency'
    name: str                      # e.g., 'Primary Route'
    path: List[List[float]]        # coordinates [[lat, lng], ...]
    distance: str                  # e.g. "4.2 km"
    travel_time: str               # e.g. "12 min"
    congestion_score: int          # 0-100
    route_score: int               # 0-100 (overall index, higher is better)
    recommended: bool              # true for the best diversion path


class DiversionResponse(BaseModel):
    routes: List[RouteMetric]
    estimated_vehicles_diverted: int
    estimated_delay_reduction: str # e.g. "28%"
    diversion_required: bool
