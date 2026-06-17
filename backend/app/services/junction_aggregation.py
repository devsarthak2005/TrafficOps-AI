"""Junction aggregation service.

Computes summary statistics for a junction by querying its incidents from
SQLite and aggregating with Pandas. Used by the GET /junctions/{id}/summary
endpoint to power the hover intelligence card.
"""

from __future__ import annotations

from collections import Counter

import pandas as pd

from ..db import get_cursor
from .health_score import compute_health_score

# Approximate clearance times in minutes per severity level.
# NOTE: This is a deterministic approximation — real clearance data is not
# available in the Astram dataset. This weighted average is used as a
# plausible stand-in. Future phases may refine with real clearance telemetry.
_CLEARANCE_MINUTES_BY_SEVERITY: dict[str, int] = {
    "low": 10,
    "moderate": 20,
    "high": 35,
    "critical": 60,
}


def _compute_peak_risk_hours(df: pd.DataFrame) -> str:
    """Find the 2-hour window with the most incidents.

    Returns a formatted string like "17:00–19:00", or "N/A" if no data.
    """
    if df.empty:
        return "N/A"

    # Parse timestamps and extract hour
    timestamps = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    timestamps = timestamps.dropna()
    if timestamps.empty:
        return "N/A"

    hours = timestamps.dt.hour

    # Count incidents per hour
    hour_counts = hours.value_counts().sort_index()

    # Find peak 2-hour window by sliding window
    best_start = 0
    best_count = 0
    for h in range(24):
        # 2-hour window: h and (h+1) % 24
        window_count = hour_counts.get(h, 0) + hour_counts.get((h + 1) % 24, 0)
        if window_count > best_count:
            best_count = window_count
            best_start = h

    end_hour = (best_start + 2) % 24
    return f"{best_start:02d}:00\u2013{end_hour:02d}:00"


def _compute_avg_clearance(df: pd.DataFrame) -> int:
    """Compute an approximate average clearance time from severity distribution.

    Since the Astram dataset doesn't contain actual clearance/resolution
    durations, we derive a deterministic estimate by mapping each incident's
    severity to a plausible clearance duration and averaging.
    """
    if df.empty:
        return 0

    severities = df["severity"]
    total_minutes = sum(
        _CLEARANCE_MINUTES_BY_SEVERITY.get(sev, 20) for sev in severities
    )
    return round(total_minutes / len(severities))


def get_junction_summary(junction_id: str, include_simulated: bool = False) -> dict:
    """Compute aggregated summary statistics for a single junction.

    Returns a dict with all fields needed by the JunctionSummaryResponse
    schema. Uses real incident data from Phase 3 and the real health score
    engine from Phase 5.
    """
    # Fetch all incidents for this junction
    with get_cursor() as cur:
        cur.execute(
            "SELECT incident_type, severity, timestamp FROM incidents WHERE junction_id = ?",
            (junction_id,),
        )
        rows = cur.fetchall()

    df = pd.DataFrame(
        [dict(row) for row in rows],
        columns=["incident_type", "severity", "timestamp"],
    )

    # --- Aggregations ---

    incident_count = len(df)

    # Top incident cause (mode of incident_type)
    if incident_count > 0:
        type_counts = Counter(df["incident_type"])
        top_incident_cause = type_counts.most_common(1)[0][0]
    else:
        top_incident_cause = "none"

    peak_risk_hours = _compute_peak_risk_hours(df)
    avg_clearance_time_minutes = _compute_avg_clearance(df)

    # Placeholder: hospital impact — Phase 11 replaces this
    hospital_impact = "Not assessed"  # placeholder — Phase 11

    # Real health score from Phase 5 engine
    health_result = compute_health_score(junction_id, include_simulated)
    health_score = health_result["health_score"]
    risk_category = health_result["risk_category"]

    return {
        "junction_id": junction_id,
        "health_score": health_score,
        "risk_category": risk_category,
        "incident_count": incident_count,
        "top_incident_cause": top_incident_cause,
        "peak_risk_hours": peak_risk_hours,
        "avg_clearance_time_minutes": avg_clearance_time_minutes,
        "hospital_impact": hospital_impact,
    }
