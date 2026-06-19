from __future__ import annotations

from fastapi import APIRouter

from ..schemas.operations import OptimizationRequest, OptimizationResponse
from ..services.resource_optimizer import optimize_resource_allocation

router = APIRouter()


@router.post("/operations/optimize", response_model=OptimizationResponse)
@router.post("/api/operations/optimize", response_model=OptimizationResponse)
def optimize_allocation(request: OptimizationRequest) -> OptimizationResponse:
    """
    Run scoring-based resource optimization to generate an operational deployment plan.
    """
    return optimize_resource_allocation(request)
