from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..schemas.hospital_status import HospitalStatusResponse, HospitalDetailResponse
from ..services.hospital_reachability import get_all_hospitals_status, compute_hospital_accessibility

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

@router.get("/status", response_model=list[HospitalStatusResponse])
def get_hospitals_status(include_simulated: bool = Query(False, description="Include active simulations")):
    """Get accessibility status for all hospitals."""
    return get_all_hospitals_status(include_simulated=include_simulated)

@router.get("/{hospital_id}/status", response_model=HospitalDetailResponse)
def get_hospital_status(hospital_id: str, include_simulated: bool = Query(False, description="Include active simulations")):
    """Get detailed accessibility status for a specific hospital including access junctions."""
    try:
        return compute_hospital_accessibility(hospital_id, include_simulated=include_simulated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
