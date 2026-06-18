from __future__ import annotations

from typing import List
from pydantic import BaseModel


class PredictionRequest(BaseModel):
    event_cause: str
    event_type: str
    priority: str
    requires_road_closure: bool
    latitude: float
    longitude: float
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
