from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..db import get_cursor
from ..schemas import JunctionResponse, JunctionSummaryResponse, JunctionHealthResponse
from ..services.junction_aggregation import get_junction_summary
from ..services.health_score import compute_health_score

router = APIRouter()


@router.get("/junctions/health-summary", response_model=list[JunctionHealthResponse])
def health_summary(include_simulated: bool = False) -> list[JunctionHealthResponse]:
    """Return health score + risk category for ALL junctions in a single call.

    The map needs this in bulk on load to color all markers, avoiding 8+
    sequential requests.
    """
    with get_cursor() as cur:
        cur.execute("SELECT id FROM junctions ORDER BY name")
        junction_rows = cur.fetchall()

    results: list[JunctionHealthResponse] = []
    for row in junction_rows:
        junction_id = row["id"]
        health = compute_health_score(junction_id, include_simulated)
        results.append(
            JunctionHealthResponse(
                junction_id=junction_id,
                health_score=health["health_score"],
                risk_category=health["risk_category"],
            )
        )
    return results


@router.get("/junctions", response_model=list[JunctionResponse])
def list_junctions() -> list[JunctionResponse]:
    """Return all junctions with their static metadata."""
    with get_cursor() as cur:
        cur.execute("SELECT id, name, lat, lng, road_type FROM junctions ORDER BY name")
        rows = cur.fetchall()
    return [
        JunctionResponse(
            id=row["id"],
            name=row["name"],
            lat=row["lat"],
            lng=row["lng"],
            road_type=row["road_type"],
        )
        for row in rows
    ]


@router.get("/junctions/{junction_id}/summary", response_model=JunctionSummaryResponse)
def junction_summary(junction_id: str, include_simulated: bool = False) -> JunctionSummaryResponse:
    """Return aggregated incident summary for a single junction."""
    # Verify junction exists
    with get_cursor() as cur:
        cur.execute("SELECT id, name FROM junctions WHERE id = ?", (junction_id,))
        junction_row = cur.fetchone()

    if junction_row is None:
        raise HTTPException(status_code=404, detail=f"Junction '{junction_id}' not found")

    summary = get_junction_summary(junction_id, include_simulated)
    return JunctionSummaryResponse(
        junction_name=junction_row["name"],
        **summary,
    )
