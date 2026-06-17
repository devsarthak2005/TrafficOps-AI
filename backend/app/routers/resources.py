from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..db import get_cursor
from ..schemas import ResourceRecommendationResponse
from ..services.resource_engine import recommend_resources

router = APIRouter()


@router.get("/junctions/{junction_id}/resources", response_model=ResourceRecommendationResponse)
def get_junction_resources(junction_id: str) -> ResourceRecommendationResponse:
    """Return resource deployment recommendations for a given junction."""
    # Verify the junction exists in the database
    with get_cursor() as cur:
        cur.execute("SELECT id FROM junctions WHERE id = ?", (junction_id,))
        junction_row = cur.fetchone()

    if junction_row is None:
        raise HTTPException(status_code=404, detail=f"Junction '{junction_id}' not found")

    # Fetch recommendation details
    recommendation_data = recommend_resources(junction_id)
    return ResourceRecommendationResponse(**recommendation_data)
