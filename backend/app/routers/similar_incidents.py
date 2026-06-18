from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..schemas.similar_incident import SimilarIncidentsResponse, SimilarIncidentResult
from ..services.similarity_engine import find_similar_incidents
from ..db import get_cursor

router = APIRouter()


@router.get("/incidents/{id}/similar", response_model=SimilarIncidentsResponse)
def get_similar_incidents(
    id: str,
    top_n: int = Query(5, description="Number of top similar incidents to return"),
) -> SimilarIncidentsResponse:
    """Find historical incidents similar to the specified incident."""
    # Check if the query incident exists in the DB
    with get_cursor() as cur:
        cur.execute("SELECT id FROM incidents WHERE id = ?", (id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Incident with ID {id} not found")

    results = find_similar_incidents(id, top_n=top_n)

    # Convert dictionary results to SimilarIncidentResult instances
    parsed_results = [
        SimilarIncidentResult(
            incident_id=r["incident_id"],
            incident_type=r["incident_type"],
            severity=r["severity"],
            junction_id=r["junction_id"],
            junction_name=r["junction_name"],
            timestamp=r["timestamp"],
            weather=r["weather"],
            similarity_score=r["similarity_score"],
            matched_factors=r["matched_factors"],
            weak_match=r["weak_match"],
        )
        for r in results
    ]

    return SimilarIncidentsResponse(query_incident_id=id, results=parsed_results)
