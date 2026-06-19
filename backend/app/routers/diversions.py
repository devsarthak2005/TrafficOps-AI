from __future__ import annotations

from fastapi import APIRouter

from ..schemas.diversion import DiversionRequest, DiversionResponse
from ..services.diversion_planner import plan_diversion_routes

router = APIRouter()


@router.post("/diversions/generate", response_model=DiversionResponse)
@router.post("/api/diversions/generate", response_model=DiversionResponse)
def generate_diversions(request: DiversionRequest) -> DiversionResponse:
    """
    Generate traffic bypasses and comparison metrics for an active event.
    """
    return plan_diversion_routes(request)
