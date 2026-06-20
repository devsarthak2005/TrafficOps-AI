from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from ..db import get_cursor
from ..schemas import IncidentResponse, IncidentCreateRequest

router = APIRouter()


@router.get("/incidents", response_model=list[IncidentResponse])
def list_incidents(
    junction_id: Optional[str] = Query(None, description="Filter by junction ID"),
    incident_type: Optional[str] = Query(None, description="Filter by incident type"),
    since: Optional[str] = Query(None, description="Only incidents after this ISO 8601 timestamp"),
) -> list[IncidentResponse]:
    """Return incidents, newest first, with optional filters."""
    clauses: list[str] = []
    params: list[str | float] = []

    if junction_id is not None:
        clauses.append("junction_id = ?")
        params.append(junction_id)
    if incident_type is not None:
        clauses.append("incident_type = ?")
        params.append(incident_type)
    if since is not None:
        clauses.append("timestamp >= ?")
        params.append(since)

    where = ""
    if clauses:
        where = "WHERE " + " AND ".join(clauses)

    query = f"""
        SELECT id, junction_id, incident_type, severity,
               timestamp, weather, temperature_c, description
        FROM incidents
        {where}
        ORDER BY timestamp DESC
    """

    with get_cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [
        IncidentResponse(
            id=row["id"],
            junction_id=row["junction_id"],
            incident_type=row["incident_type"],
            severity=row["severity"],
            timestamp=row["timestamp"],
            weather=row["weather"],
            temperature_c=row["temperature_c"],
            description=row["description"],
        )
        for row in rows
    ]


@router.get("/incidents/{id}", response_model=IncidentResponse)
def get_incident(id: str) -> IncidentResponse:
    """Return a single incident by ID."""
    from fastapi import HTTPException
    
    query = """
        SELECT id, junction_id, incident_type, severity,
               timestamp, weather, temperature_c, description
        FROM incidents
        WHERE id = ?
    """
    with get_cursor() as cur:
        cur.execute(query, (id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")

    return IncidentResponse(
        id=row["id"],
        junction_id=row["junction_id"],
        incident_type=row["incident_type"],
        severity=row["severity"],
        timestamp=row["timestamp"],
        weather=row["weather"],
        temperature_c=row["temperature_c"],
        description=row["description"],
    )


@router.post("/incidents", response_model=IncidentResponse)
@router.post("/api/incidents", response_model=IncidentResponse)
def create_incident(request: IncidentCreateRequest) -> IncidentResponse:
    """Create and ingest a new incident into SQLite database."""
    import uuid
    from datetime import datetime, timezone
    
    inc_id = f"inc_{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()
    
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO incidents (id, junction_id, incident_type, severity, timestamp, weather, temperature_c, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                inc_id,
                request.junction_id,
                request.incident_type,
                request.severity,
                now_str,
                request.weather,
                request.temperature_c,
                request.description
            )
        )
        
    return IncidentResponse(
        id=inc_id,
        junction_id=request.junction_id,
        incident_type=request.incident_type,
        severity=request.severity,
        timestamp=now_str,
        weather=request.weather,
        temperature_c=request.temperature_c,
        description=request.description
    )


