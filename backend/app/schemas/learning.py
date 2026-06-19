from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class FeedbackItem(BaseModel):
    event_id: str
    predicted_impact: str
    actual_impact: str
    confidence: float
    prediction_correct: bool
    resource_efficiency: float  # e.g., actual/planned resources, 0 to 1
    diversion_success: float     # e.g., travel time savings ratio
    resolution_time: float      # in hours
    zone: str
    event_cause: str


class ZoneInsight(BaseModel):
    zone: str
    accuracy: float
    average_resolution_time: float


class AnalyticsResponse(BaseModel):
    total_events: int
    prediction_accuracy: float
    average_resource_efficiency: float
    average_diversion_effectiveness: float
    model_drift_indicator: float  # accuracy difference over last 10 events
    zone_insights: List[ZoneInsight]
    ai_insights: List[str]


class RetrainResponse(BaseModel):
    status: str
    old_accuracy: float
    new_accuracy: float
    timestamp: str
