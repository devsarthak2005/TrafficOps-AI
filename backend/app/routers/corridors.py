from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import HospitalResponse, CorridorRequest, CorridorResponse
from ..services.hospitals import get_all_hospitals
from ..services.corridor_planner import plan_corridor

router = APIRouter()


@router.get("/hospitals", response_model=list[HospitalResponse])
def list_hospitals() -> list[HospitalResponse]:
    """Return all available hospitals with their coordinates."""
    return get_all_hospitals()


@router.post("/corridors/plan", response_model=CorridorResponse)
def plan_emergency_corridor(request: CorridorRequest) -> CorridorResponse:
    """Plan emergency corridors between selected hospital and incident junction."""
    plan = plan_corridor(request.hospital_id, request.incident_junction_id)
    if not plan:
        raise HTTPException(
            status_code=400,
            detail="Failed to compute corridor. Please check hospital and incident junction IDs."
        )
    return CorridorResponse(**plan)
