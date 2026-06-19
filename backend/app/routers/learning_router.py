from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas.learning import FeedbackItem, AnalyticsResponse, RetrainResponse
from ..services.learning_service import save_feedback_item, calculate_learning_analytics, trigger_model_retraining

router = APIRouter()


@router.post("/ml/feedback")
def submit_event_feedback(item: FeedbackItem) -> dict:
    """
    Submit actual operational outcome feedback for a completed event.
    """
    try:
        save_feedback_item(item)
        return {"status": "success", "message": f"Feedback logged for event {item.event_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log feedback: {e}")


@router.get("/ml/feedback/analytics", response_model=AnalyticsResponse)
def get_feedback_analytics() -> AnalyticsResponse:
    """
    Calculate and return learning metrics and model drift analytics.
    """
    return calculate_learning_analytics()


@router.post("/ml/retrain", response_model=RetrainResponse)
def retrain_ml_model() -> RetrainResponse:
    """
    Trigger manual retraining of the XGBoost classifier.
    """
    try:
        return trigger_model_retraining()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {e}")
