from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

from ..schemas.alert import AlertPayload, AcknowledgeRequest, AcknowledgeResponse, ResolveRequest, ResolveResponse
from ..services.alert_service import get_alerts_from_db, generate_predictive_alerts, acknowledge_alert, resolve_alert

router = APIRouter()


@router.get("/alerts", response_model=List[AlertPayload])
def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: Watch, Warning, Critical"),
    status: Optional[str] = Query(None, description="Filter by status: active, acknowledged, resolved")
) -> List[AlertPayload]:
    """
    Retrieve predictive alerts. Generates new alerts automatically if simulations are active.
    """
    # Trigger generation of alerts from active simulations
    generate_predictive_alerts()

    # Query filtered alerts from database
    return get_alerts_from_db(severity=severity, status=status)


@router.post("/alerts/acknowledge", response_model=AcknowledgeResponse)
def post_acknowledge(request: AcknowledgeRequest) -> AcknowledgeResponse:
    """
    Acknowledge an active warning/critical alert.
    """
    success = acknowledge_alert(request.alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already in state")
    return AcknowledgeResponse(alert_id=request.alert_id, status="acknowledged")


@router.post("/alerts/resolve", response_model=ResolveResponse)
def post_resolve(request: ResolveRequest) -> ResolveResponse:
    """
    Resolve/dismiss an alert.
    """
    success = resolve_alert(request.alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already in state")
    return ResolveResponse(alert_id=request.alert_id, status="resolved")
