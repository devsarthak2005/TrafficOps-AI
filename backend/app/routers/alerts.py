from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from ..schemas import AlertResponse, DismissResponse
from ..services.alert_engine import get_active_alerts

router = APIRouter()

# In-memory store for dismissed alerts: alert_id -> suppressed_until (datetime)
_DISMISSED_ALERTS: dict[str, datetime] = {}


def _cleanup_expired_dismissals() -> None:
    """Remove expired dismissals from the in-memory set."""
    now = datetime.now(timezone.utc)
    for alert_id in list(_DISMISSED_ALERTS.keys()):
        if _DISMISSED_ALERTS[alert_id] < now:
            _DISMISSED_ALERTS.pop(alert_id, None)


@router.get("/alerts/active", response_model=list[AlertResponse])
def get_active() -> list[AlertResponse]:
    """Evaluate all predictive detectors and return non-dismissed active alerts."""
    _cleanup_expired_dismissals()
    
    alerts = get_active_alerts()
    # Filter out currently suppressed alerts
    active_alerts = [
        AlertResponse(**a) for a in alerts
        if a["alert_id"] not in _DISMISSED_ALERTS
    ]
    return active_alerts


@router.post("/alerts/{alert_id}/dismiss", response_model=DismissResponse)
def dismiss_alert(alert_id: str) -> DismissResponse:
    """Dismiss/suppress an alert for 15 minutes, preventing it from showing up on active queries."""
    now = datetime.now(timezone.utc)
    suppressed_until = now + timedelta(minutes=15)
    _DISMISSED_ALERTS[alert_id] = suppressed_until
    
    return DismissResponse(
        alert_id=alert_id,
        status="dismissed",
        suppressed_until=suppressed_until.strftime("%Y-%m-%dT%H:%M:%SZ")
    )
