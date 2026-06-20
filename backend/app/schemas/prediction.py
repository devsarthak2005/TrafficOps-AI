from __future__ import annotations

from typing import List
from enum import Enum
from pydantic import BaseModel, Field


class EventType(str, Enum):
    unplanned = "unplanned"
    planned = "planned"


class EventCause(str, Enum):
    vehicle_breakdown = "vehicle_breakdown"
    others = "others"
    tree_fall = "tree_fall"
    accident = "accident"
    public_event = "public_event"
    waterlogging = "waterlogging"
    pothole = "pothole"
    congestion = "congestion"
    construction = "construction"
    road_conditions = "road_conditions"
    vip_movement = "vip_movement"
    procession = "procession"
    protest = "protest"
    debris = "debris"
    fog_low_visibility = "fog / low visibility"
    test_demo = "test_demo"


class PredictionRequest(BaseModel):
    event_cause: EventCause
    event_type: EventType
    priority: str
    requires_road_closure: bool
    latitude: float = Field(..., ge=12.7, le=13.2)
    longitude: float = Field(..., ge=77.4, le=77.8)
    start_datetime: str  # ISO 8601 formatted datetime string, e.g. "2026-06-18T18:30:00+05:30"


class PredictionResponse(BaseModel):
    predicted_impact: str  # e.g., 'Low', 'Medium', 'High', 'Critical'
    confidence: float      # percentage, e.g. 91.0
    reasons: List[str]     # top contributing features list, e.g., ["Peak hour contributed +24%"]
    explanation: str       # full human-readable explanation text
    recommendations: List[str] # operational recommendation messages


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float      # percentage or relative importance


class FeatureImportanceResponse(BaseModel):
    importances: List[FeatureImportanceItem]


class RecoveryTimeRequest(BaseModel):
    event_cause: EventCause
    event_type: EventType
    priority: str
    requires_road_closure: bool
    latitude: float = Field(..., ge=12.7, le=13.2)
    longitude: float = Field(..., ge=77.4, le=77.8)
    zone: str
    corridor: str
    junction: str
    start_datetime: str


class RecoveryTimeResponse(BaseModel):
    duration_minutes: int
    model_version: str = "1.0"


class EscalationRequest(BaseModel):
    event_cause: EventCause
    event_type: EventType
    priority: str
    requires_road_closure: bool
    latitude: float = Field(..., ge=12.7, le=13.2)
    longitude: float = Field(..., ge=77.4, le=77.8)
    zone: str
    junction: str
    start_datetime: str


class EscalationResponse(BaseModel):
    will_escalate: bool
    probability: float
    confidence: float


class SimulationNoInterventionRequest(BaseModel):
    junction_id: str
    current_risk_score: float
    duration_hours: int = 4


class TimelineStep(BaseModel):
    time_minutes: int
    time_label: str
    risk_score: float
    congestion_class: str
    fuel_loss_liters: float
    economic_loss_inr: float
    hospital_accessibility_score: int
    emergency_delay_minutes: float


class SimulationNoInterventionResponse(BaseModel):
    junction_id: str
    junction_name: str
    vehicles_affected_estimate: int
    timeline: list[TimelineStep]
    total_fuel_loss_liters: float
    total_economic_loss_inr: float
    max_emergency_delay_minutes: float
    assumptions: dict[str, float | str]


class CrowdMovementRequest(BaseModel):
    latitude: float
    longitude: float
    event_type: str
    start_datetime: str


class HotspotPrediction(BaseModel):
    junction_id: str
    junction_name: str
    traffic_increase_pct: float
    distance_km: float


class CrowdMovementResponse(BaseModel):
    method: str = "proximity_heuristic"
    hotspots: list[HotspotPrediction]


