from __future__ import annotations

from pydantic import BaseModel

from .junction import JunctionResponse
from .incident import IncidentResponse, IncidentCreateRequest
from .junction_summary import JunctionSummaryResponse
from .junction_health import JunctionHealthResponse
from .zone import ZoneStatusResponse
from .simulation import SimulationRequest, SimulationResponse
from .resource_recommendation import ResourceRecommendationResponse
from .alert import AlertResponse, DismissResponse
from .corridor import HospitalResponse, CorridorRequest, CorridorResponse
from .similar_incident import SimilarIncidentResult, SimilarIncidentsResponse

class HealthResponse(BaseModel):
    status: str
    service: str

__all__ = [
    "HealthResponse", 
    "JunctionResponse", 
    "IncidentResponse", 
    "IncidentCreateRequest",
    "JunctionSummaryResponse", 
    "JunctionHealthResponse", 
    "ZoneStatusResponse",
    "SimulationRequest",
    "SimulationResponse",
    "ResourceRecommendationResponse",
    "AlertResponse",
    "DismissResponse",
    "HospitalResponse",
    "CorridorRequest",
    "CorridorResponse",
    "SimilarIncidentResult",
    "SimilarIncidentsResponse"
]


