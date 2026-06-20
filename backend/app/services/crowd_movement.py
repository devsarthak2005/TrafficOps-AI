from __future__ import annotations

import math
from typing import Any
from ..db import get_cursor
from .hospital_reachability import haversine_distance
from ..schemas.prediction import HotspotPrediction

def predict_secondary_hotspots(
    event_lat: float,
    event_lng: float,
    event_type: str,
    is_peak_hour: bool
) -> list[HotspotPrediction]:
    """
    Predicts top secondary hotspots affected by crowd movement spillover.
    Uses dynamic max search radii based on the event type.
    """
    # 1. Determine dynamic search radius based on event type
    event_type_lower = event_type.lower()
    if "rally" in event_type_lower or "protest" in event_type_lower:
        max_dist_km = 6.0
    elif "festival" in event_type_lower or "public" in event_type_lower:
        max_dist_km = 5.0
    elif "sports" in event_type_lower:
        max_dist_km = 4.5
    else:
        max_dist_km = 4.0

    # 2. Query junctions
    with get_cursor() as cur:
        cur.execute("SELECT id, name, lat, lng FROM junctions")
        rows = cur.fetchall()
    junctions = [dict(row) for row in rows]

    # 3. Query historical incident count per junction
    with get_cursor() as cur:
        cur.execute("SELECT junction_id, COUNT(*) as count FROM incidents GROUP BY junction_id")
        rows_inc = cur.fetchall()
    incident_counts = {row["junction_id"]: row["count"] for row in rows_inc}

    hotspots = []
    for j in junctions:
        j_id = j["id"]
        # Skip the primary event junction itself to find secondary hotspots
        dist = haversine_distance(event_lat, event_lng, j["lat"], j["lng"])
        if 0.01 < dist <= max_dist_km:
            # Linear falloff proximity weight
            proximity_weight = 1.0 - (dist / max_dist_km)
            
            # Base increase based on peak hour
            base_increase = 25.0 if is_peak_hour else 12.0
            traffic_increase_pct = round(base_increase * proximity_weight, 1)
            
            incident_count = incident_counts.get(j_id, 0)
            score = incident_count * proximity_weight
            
            hotspots.append({
                "junction_id": j_id,
                "junction_name": j["name"],
                "traffic_increase_pct": traffic_increase_pct,
                "distance_km": round(dist, 2),
                "score": score
            })

    # Sort descending by custom ranking score and take top 3
    hotspots_sorted = sorted(hotspots, key=lambda x: x["score"], reverse=True)

    return [
        HotspotPrediction(
            junction_id=h["junction_id"],
            junction_name=h["junction_name"],
            traffic_increase_pct=h["traffic_increase_pct"],
            distance_km=h["distance_km"]
        )
        for h in hotspots_sorted[:3]
    ]
