from __future__ import annotations

from pydantic import BaseModel

from .junction import JunctionResponse
from .incident import IncidentResponse
from .junction_summary import JunctionSummaryResponse
from .junction_health import JunctionHealthResponse
from .zone import ZoneStatusResponse
from .simulation import SimulationRequest, SimulationResponse
from .resource_recommendation import ResourceRecommendationResponse

class HealthResponse(BaseModel):
    status: str
    service: str

__all__ = [
    "HealthResponse", 
    "JunctionResponse", 
    "IncidentResponse", 
    "JunctionSummaryResponse", 
    "JunctionHealthResponse", 
    "ZoneStatusResponse",
    "SimulationRequest",
    "SimulationResponse",
    "ResourceRecommendationResponse"
]

