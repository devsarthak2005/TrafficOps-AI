from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


class TimelineSnapshot(BaseModel):
    timestamp: str                 # ISO timestamp or relative time string
    stage: str                     # e.g., 'EVENT_CREATED', 'PREDICTION_GENERATED', 'ALERT_RAISED'
    location: List[float]          # [lat, lng]
    severity: str                  # 'Low', 'Medium', 'High', 'Critical'
    congestion_score: int          # 0 to 100
    confidence: float              # 0.0 to 100.0 (percentage prediction confidence)
    description: str              # Description of the stage's state or actions taken


class PredictionAudit(BaseModel):
    predicted_impact: str          # 'Low' / 'Medium' / 'High' / 'Critical'
    actual_outcome: str            # 'Low' / 'Medium' / 'High' / 'Critical'
    confidence: float              # 0.0 to 100.0
    success_indicator: str         # e.g., 'Optimal Alignment', 'Accurate Forecast'


class ResourceEffectiveness(BaseModel):
    officers_deployed: int
    estimated_delay_reduction: str # e.g. "28%"
    diversion_success: str         # e.g. "85% detoured"


class ReplayDetailResponse(BaseModel):
    event_id: str
    event_type: str
    location: List[float]
    title: str
    severity: str
    created_at: str
    timeline: List[TimelineSnapshot]
    prediction_audit: PredictionAudit
    resource_effectiveness: ResourceEffectiveness
    learning_insight: str


class ReplaySummaryResponse(BaseModel):
    event_id: str
    title: str
    severity: str
    created_at: str
