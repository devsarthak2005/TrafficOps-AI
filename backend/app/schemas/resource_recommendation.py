from __future__ import annotations

from pydantic import BaseModel

class RecommendationDetails(BaseModel):
    officers: int
    barricades: int
    patrol_vehicles: int
    ambulances: int
    diversion_routes: list[str]

class ResourceRecommendationResponse(BaseModel):
    junction_id: str
    risk_category: str
    is_simulated: bool
    recommendation: RecommendationDetails
