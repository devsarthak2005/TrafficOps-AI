from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class PredictionData(BaseModel):
    impact_level: str
    confidence: float


class FeatureContribution(BaseModel):
    feature: str
    contribution: float


class ResourcePlanData(BaseModel):
    deployment_score: float
    officers_required: int
    patrol_vehicles: int
    barricades: int
    diversion_level: str
    emergency_corridor_required: bool
    estimated_response_time: str
    estimated_operational_cost: float


class DiversionPlanData(BaseModel):
    routes: Optional[List[Dict[str, Any]]] = None
    estimated_vehicles_diverted: Optional[int] = 0
    estimated_delay_reduction: Optional[Any] = "0%"


class EventMetadataData(BaseModel):
    event_type: str
    event_cause: str
    zone: str
    junction: str
    attendance: int
    duration: float
    start_time: str


class CopilotBriefingRequest(BaseModel):
    prediction: PredictionData
    feature_contributions: List[FeatureContribution]
    resource_plan: ResourcePlanData
    diversion_plan: Optional[DiversionPlanData] = None
    event_metadata: EventMetadataData


class CopilotBriefingResponse(BaseModel):
    summary: str
    risks: List[str]
    actions: List[str]
    confidence: float
    generated_by: str  # "gemini" or "fallback"
    timestamp: str
    commissioner_briefing: Optional[str] = None
    citizen_advisory: Optional[str] = None
