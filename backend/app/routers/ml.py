from __future__ import annotations

from fastapi import APIRouter

from ..schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    FeatureImportanceItem,
    FeatureImportanceResponse,
    RecoveryTimeRequest,
    RecoveryTimeResponse,
)
from ..services.predictor import predictor_service
from ..services.recommendation_engine import get_recommendations

router = APIRouter()


@router.post("/ml/predict", response_model=PredictionResponse)
def predict_congestion_impact(request: PredictionRequest) -> PredictionResponse:
    """
    Predict congestion impact, extract local explanations, and generate operational recommendations.
    """
    # Use predictor_service to predict and explain
    pred_res = predictor_service.predict(request.dict())
    
    # Generate operational recommendations
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
