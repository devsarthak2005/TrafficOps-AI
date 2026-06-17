from __future__ import annotations

from fastapi import APIRouter

from ..schemas.zone import ZoneStatusResponse
from ..services.zones import get_zone_status

router = APIRouter()

@router.get("/zones/status", response_model=list[ZoneStatusResponse])
def zone_status(include_simulated: bool = False) -> list[ZoneStatusResponse]:
    """Return the worst-case health category for each zone."""
    return get_zone_status(include_simulated)
