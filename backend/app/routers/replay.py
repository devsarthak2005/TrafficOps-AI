from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException

from ..schemas.replay import ReplayDetailResponse, ReplaySummaryResponse
from ..services.replay_service import list_replay_events, get_event_replay

router = APIRouter()


@router.get("/replay", response_model=List[ReplaySummaryResponse])
@router.get("/api/replay", response_model=List[ReplaySummaryResponse])
def get_replay_list() -> List[ReplaySummaryResponse]:
    """
    Get the list of all available replay summaries, including pre-generated demo events
    and real historical incidents from the SQLite database.
    """
    return list_replay_events()


@router.get("/replay/{event_id}", response_model=ReplayDetailResponse)
@router.get("/api/replay/{event_id}", response_model=ReplayDetailResponse)
def get_event_replay_detail(event_id: str) -> ReplayDetailResponse:
    """
    Get detailed timeline snapshots, prediction performance audits, and resource
    effectiveness metrics for the given event ID.
    """
    try:
        return get_event_replay(event_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
