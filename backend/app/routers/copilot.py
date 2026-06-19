from __future__ import annotations

from fastapi import APIRouter

from ..schemas.copilot import CopilotBriefingRequest, CopilotBriefingResponse
from ..services.traffic_commander import generate_executive_briefing

router = APIRouter()


@router.post("/copilot/briefing", response_model=CopilotBriefingResponse)
@router.post("/api/copilot/briefing", response_model=CopilotBriefingResponse)
def get_executive_briefing(request: CopilotBriefingRequest) -> CopilotBriefingResponse:
    """
    Generate an executive briefing from ML predictions, resource allocations, diversions and metadata.
    """
    return generate_executive_briefing(request)
