from __future__ import annotations

import logging
from datetime import datetime

from ..db import get_cursor
from .zones import JUNCTION_ZONES

logger = logging.getLogger(__name__)

SEVERITY_TIERS = {
    "low": 0,
    "moderate": 1,
    "high": 2,
    "critical": 3
}


def parse_iso_timestamp(ts_str: str) -> datetime:
    """Parse SQLite timestamp string to a datetime object."""
    # SQLite stored format is YYYY-MM-DDTHH:MM:SSZ
    # Replace 'Z' with '+00:00' to parse cleanly with fromisoformat
    clean_str = ts_str.replace("Z", "+00:00")
    return datetime.fromisoformat(clean_str)


def get_time_of_day_diff_seconds(dt1: datetime, dt2: datetime) -> float:
    """Calculate the shortest difference in seconds between two times of day, ignoring date."""
    t1_secs = dt1.hour * 3600 + dt1.minute * 60 + dt1.second
    t2_secs = dt2.hour * 3600 + dt2.minute * 60 + dt2.second
    diff = abs(t1_secs - t2_secs)
    return min(diff, 24 * 3600 - diff)


def find_similar_incidents(incident_id: str, top_n: int = 5) -> list[dict]:
    """Given a query incident ID, find the top_n most similar historical incidents."""
    # 1. Fetch query incident
    with get_cursor() as cur:
        cur.execute(
            """SELECT i.id, i.junction_id, j.name as junction_name, i.incident_type, 
                      i.severity, i.timestamp, i.weather, i.temperature_c, i.description
               FROM incidents i
               JOIN junctions j ON i.junction_id = j.id
               WHERE i.id = ?""",
            (incident_id,),
        )
        query_row = cur.fetchone()
        
    if not query_row:
        logger.warning("Incident with ID %s not found in database.", incident_id)
        return []

    q_incident = dict(query_row)
    q_timestamp = parse_iso_timestamp(q_incident["timestamp"])
    q_severity_tier = SEVERITY_TIERS.get(q_incident["severity"].lower(), -99)
    q_zone = JUNCTION_ZONES.get(q_incident["junction_id"])

    # 2. Fetch all other incidents
    with get_cursor() as cur:
        cur.execute(
            """SELECT i.id, i.junction_id, j.name as junction_name, i.incident_type, 
                      i.severity, i.timestamp, i.weather, i.temperature_c, i.description
               FROM incidents i
               JOIN junctions j ON i.junction_id = j.id
               WHERE i.id != ?""",
            (incident_id,),
        )
        all_rows = cur.fetchall()

    results = []
    for row in all_rows:
        h_incident = dict(row)
        score = 0
        matched_factors = []

        # -- same incident type (+40 points) --
        if q_incident["incident_type"].lower() == h_incident["incident_type"].lower():
            score += 40
            matched_factors.append("same_incident_type")

        # -- junction and zone scoring --
        # same junction (+25 points) OR same zone if different junction (+10 points)
        if q_incident["junction_id"] == h_incident["junction_id"]:
            score += 25
            matched_factors.append("same_junction")
        else:
            h_zone = JUNCTION_ZONES.get(h_incident["junction_id"])
            if q_zone is not None and h_zone is not None and q_zone == h_zone:
                score += 10
                matched_factors.append("same_zone")

        # -- weather matching (+15 points) --
        if q_incident["weather"].lower() == h_incident["weather"].lower():
            score += 15
            matched_factors.append("same_weather")

        # -- similar time-of-day (+10 points if within 2-hour window) --
        h_timestamp = parse_iso_timestamp(h_incident["timestamp"])
        time_diff = get_time_of_day_diff_seconds(q_timestamp, h_timestamp)
        if time_diff <= 2 * 3600:
            score += 10
            matched_factors.append("similar_time_of_day")

        # -- severity matching --
        # +10 points if exact match, +5 if adjacent tier
        h_severity_tier = SEVERITY_TIERS.get(h_incident["severity"].lower(), -99)
        if q_incident["severity"].lower() == h_incident["severity"].lower():
            score += 10
            matched_factors.append("same_severity")
        elif q_severity_tier != -99 and h_severity_tier != -99 and abs(q_severity_tier - h_severity_tier) == 1:
            score += 5
            matched_factors.append("adjacent_severity")

        # Flag weak match if score < 30
        weak_match = score < 30

        results.append({
            "incident_id": h_incident["id"],
            "incident_type": h_incident["incident_type"],
            "severity": h_incident["severity"],
            "junction_id": h_incident["junction_id"],
            "junction_name": h_incident["junction_name"],
            "timestamp": h_timestamp,
            "weather": h_incident["weather"],
            "similarity_score": score,
            "matched_factors": matched_factors,
            "weak_match": weak_match
        })

    # Sort: descending by similarity_score, then descending by timestamp (recency)
    results.sort(key=lambda x: x["timestamp"], reverse=True)
    results.sort(key=lambda x: x["similarity_score"], reverse=True)

    return results[:top_n]
