from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    FeatureImportanceItem,
    FeatureImportanceResponse,
    RecoveryTimeRequest,
    RecoveryTimeResponse,
    EscalationRequest,
    EscalationResponse,
)
from ..services.predictor import predictor_service
from ..services.recommendation_engine import get_recommendations
from ..services.collision_detector import get_active_events_from_db, detect_collisions, CollisionFlag

router = APIRouter()


@router.get("/ml/collision-detect", response_model=list[CollisionFlag])
@router.get("/api/ml/collision-detect", response_model=list[CollisionFlag])
def get_active_collisions() -> list[CollisionFlag]:
    """
    Detect multi-event collision clusters currently active in the database (within last 24 hours).
    """
    events = get_active_events_from_db(hours=24.0)
    return detect_collisions(events)



@router.post("/ml/predict", response_model=PredictionResponse)
def predict_congestion_impact(request: PredictionRequest) -> PredictionResponse:
    """
    Predict congestion impact, extract local explanations, and generate operational recommendations.
    """
    pred_res = predictor_service.predict(request.dict())
    recommendations = get_recommendations(pred_res["predicted_impact"])
    
    return PredictionResponse(
        predicted_impact=pred_res["predicted_impact"],
        confidence=pred_res["confidence"],
        reasons=pred_res["reasons"],
        explanation=pred_res["explanation"],
        recommendations=recommendations,
    )


@router.get("/ml/feature-importance", response_model=FeatureImportanceResponse)
def get_global_importances() -> FeatureImportanceResponse:
    """
    Get the global feature importance rankings for the trained XGBoost model.
    """
    importances = predictor_service.get_global_feature_importances()
    items = [FeatureImportanceItem(**item) for item in importances]
    return FeatureImportanceResponse(importances=items)


@router.post("/ml/recovery-time", response_model=RecoveryTimeResponse)
def predict_incident_recovery_time(request: RecoveryTimeRequest) -> RecoveryTimeResponse:
    """
    Predict the incident duration/recovery time in minutes based on pre-resolution inputs.
    """
    duration = predictor_service.predict_recovery_time(request.dict())
    return RecoveryTimeResponse(
        duration_minutes=duration,
        model_version="1.0"
    )


@router.post("/ml/escalation-risk", response_model=EscalationResponse)
def predict_incident_escalation_risk(request: EscalationRequest) -> EscalationResponse:
    """
    Predict whether an incident is likely to escalate based on pre-resolution inputs.
    """
    try:
        res = predictor_service.predict_escalation(request.dict())
        return EscalationResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=503, detail="Prediction model unavailable")
