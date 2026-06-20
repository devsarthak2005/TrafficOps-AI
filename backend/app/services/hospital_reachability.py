from __future__ import annotations

import math
from typing import Any

from .hospitals import get_all_hospitals, get_hospital_by_id, Hospital
from ..db import get_cursor
from .health_score import compute_health_score

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_hospital_access_junctions(
    hospital: Hospital, 
    n: int = 2, 
    include_simulated: bool = False, 
    now=None
) -> list[dict[str, Any]]:
    """Return the nearest n access junctions for a hospital, sorted by adjusted travel time."""
    with get_cursor() as cur:
        cur.execute("SELECT id, name, lat, lng FROM junctions")
        rows = cur.fetchall()
    junctions = [dict(row) for row in rows]
    
    junctions_with_time = []
    for j in junctions:
        dist_km = haversine_distance(hospital["lat"], hospital["lng"], j["lat"], j["lng"])
        
        # Pull junction risk category
        health = compute_health_score(j["id"], include_simulated=include_simulated, now=now)
        risk_cat = health["risk_category"]
        
        # Congestion-aware speed mapping (watchlist or critical -> 15 km/h, else 30 km/h)
        speed = 15.0 if risk_cat in ("watchlist", "critical") else 30.0
        
        # Travel time in minutes
        travel_time_min = (dist_km / speed) * 60.0
        
        j_copy = dict(j)
        j_copy["distance_km"] = dist_km
        j_copy["travel_time_min"] = travel_time_min
        j_copy["effective_health_score"] = health["health_score"]
        j_copy["risk_category"] = risk_cat
        
        junctions_with_time.append(j_copy)
        
    # Sort junctions by travel time ascending
    sorted_junctions = sorted(junctions_with_time, key=lambda x: x["travel_time_min"])
    return sorted_junctions[:n]

def compute_hospital_accessibility(
    hospital_id: str, 
    include_simulated: bool = False, 
    now=None
) -> dict[str, Any]:
    hospital = get_hospital_by_id(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital not found: {hospital_id}")

    # Re-rank and extract nearest n junctions by travel time
    access_junctions = get_hospital_access_junctions(hospital, n=2, include_simulated=include_simulated, now=now)
    
    # Calculate average travel time
    avg_travel_time = sum(j["travel_time_min"] for j in access_junctions) / len(access_junctions) if access_junctions else 0.0
    
    # Update Safe / At Risk thresholds using adjusted travel time
    if avg_travel_time <= 3.0:
        band = "safe"
    elif avg_travel_time <= 7.0:
        band = "watchlist"
    elif avg_travel_time <= 12.0:
        band = "at_risk"
    else:
        band = "critical"
        
    # Translate travel time into an accessibility score (0 to 100)
    accessibility_score = max(0, min(100, int(round(100 - (avg_travel_time / 15.0) * 100))))
    
    access_junctions_detail = []
    for j in access_junctions:
        # Calculate contribution to penalty (100 - health)
        penalty = 100 - j["effective_health_score"]
        access_junctions_detail.append({
            "junction_id": j["id"],
            "junction_name": j["name"],
            "effective_health_score": j["effective_health_score"],
            "contribution_to_penalty": int(round(penalty / len(access_junctions))) if access_junctions else 0
        })
        
    return {
        "hospital_id": hospital["id"],
        "hospital_name": hospital["name"],
        "lat": hospital["lat"],
        "lng": hospital["lng"],
        "accessibility_score": accessibility_score,
        "accessibility_band": band,
        "access_junctions": access_junctions_detail
    }

def get_all_hospitals_status(include_simulated: bool = False, now=None) -> list[dict[str, Any]]:
    hospitals = get_all_hospitals()
    statuses = []
    for h in hospitals:
        status = compute_hospital_accessibility(h["id"], include_simulated, now)
        statuses.append({
            "hospital_id": status["hospital_id"],
            "hospital_name": status["hospital_name"],
            "lat": status["lat"],
            "lng": status["lng"],
            "accessibility_score": status["accessibility_score"],
            "accessibility_band": status["accessibility_band"]
        })
    return statuses

