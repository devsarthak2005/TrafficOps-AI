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
    SimulationNoInterventionRequest,
    SimulationNoInterventionResponse,
    CrowdMovementRequest,
    CrowdMovementResponse,
)
from ..services.predictor import predictor_service
from ..services.recommendation_engine import get_recommendations
from ..services.collision_detector import get_active_events_from_db, detect_collisions, CollisionFlag
from ..services.no_intervention_simulator import simulate_no_intervention
from ..services.crowd_movement import predict_secondary_hotspots
from ..services.zone_risk_engine import predict_zone_risk, ZoneRiskRequest, ZoneRiskResponse

router = APIRouter()



@router.get("/ml/collision-detect", response_model=list[CollisionFlag])
@router.get("/api/ml/collision-detect", response_model=list[CollisionFlag])
def get_active_collisions() -> list[CollisionFlag]:
    """
    Detect multi-event collision clusters currently active in the database (within last 24 hours).
    """
    events = get_active_events_from_db(hours=24.0)
    return detect_collisions(events)


@router.post("/ml/simulate-no-intervention", response_model=SimulationNoInterventionResponse)
@router.post("/api/ml/simulate-no-intervention", response_model=SimulationNoInterventionResponse)
def simulate_inaction(request: SimulationNoInterventionRequest) -> SimulationNoInterventionResponse:
    """
    Simulates the cascading costs and delays of not intervening in a traffic incident.
    """
    try:
        return simulate_no_intervention(
            junction_id=request.junction_id,
            current_risk_score=request.current_risk_score,
            duration_hours=request.duration_hours
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/ml/crowd-movement", response_model=CrowdMovementResponse)
@router.post("/api/ml/crowd-movement", response_model=CrowdMovementResponse)
def get_crowd_movement(request: CrowdMovementRequest) -> CrowdMovementResponse:
    """
    Predict secondary traffic hotspots affected by crowd movement spillover.
    """
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(request.start_datetime.replace("Z", "+00:00"))
        hour = dt.hour
        is_peak = (8 <= hour < 11) or (17 <= hour < 21)
        
        hotspots = predict_secondary_hotspots(
            event_lat=request.latitude,
            event_lng=request.longitude,
            event_type=request.event_type,
            is_peak_hour=is_peak
        )
        return CrowdMovementResponse(hotspots=hotspots)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))





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


@router.post("/ml/zone-risk", response_model=ZoneRiskResponse)
def predict_dynamic_zone_risk(request: ZoneRiskRequest) -> ZoneRiskResponse:
    """
    Expose dynamic Zone Risk Engine results incorporating ML model predictions.
    """
    try:
        return predict_zone_risk(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

