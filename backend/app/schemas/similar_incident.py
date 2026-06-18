from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class SimilarIncidentResult(BaseModel):
    incident_id: str
    incident_type: str
    severity: str
    junction_id: str
    junction_name: str
    timestamp: datetime
    weather: str
    similarity_score: int
    matched_factors: list[str]
    weak_match: bool


class SimilarIncidentsResponse(BaseModel):
    query_incident_id: str
    results: list[SimilarIncidentResult]
