from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class IncidentResponse(BaseModel):
    id: str
    junction_id: str
    incident_type: str
    severity: str
    timestamp: datetime
    closed_datetime: datetime | None = None
    resolved_datetime: datetime | None = None
    weather: str
    temperature_c: float
    description: str


class IncidentCreateRequest(BaseModel):
    junction_id: str
    incident_type: str
    severity: str
    description: str = ""
    weather: str = "clear"
    temperature_c: float = 25.0
