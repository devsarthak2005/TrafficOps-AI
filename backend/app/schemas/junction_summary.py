from __future__ import annotations

from pydantic import BaseModel


class JunctionSummaryResponse(BaseModel):
    junction_id: str
    junction_name: str
    health_score: int
    risk_category: str
    incident_count: int
    top_incident_cause: str
    peak_risk_hours: str
    avg_clearance_time_minutes: int
    hospital_impact: str
