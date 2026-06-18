from __future__ import annotations

import math
from typing import Any

from .hospitals import get_all_hospitals, get_hospital_by_id, Hospital
from ..db import get_cursor
from .health_score import compute_health_score

def _get_all_junctions() -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute("SELECT id, name, lat, lng FROM junctions")
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def _distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # Simplification: straight-line distance instead of road-network
    return math.sqrt((lat1 - lat2)**2 + (lng1 - lng2)**2)

def get_hospital_access_junctions(hospital: Hospital, n: int = 2) -> list[dict[str, Any]]:
    """Return the nearest n access junctions for a hospital."""
    junctions = _get_all_junctions()
    sorted_junctions = sorted(
        junctions,
        key=lambda j: _distance(hospital["lat"], hospital["lng"], j["lat"], j["lng"])
    )
    return sorted_junctions[:n]

def get_band(score: int) -> str:
    if score >= 95:
        return "safe"
    elif score >= 75:
        return "watchlist"
    elif score >= 50:
        return "at_risk"
    else:
        return "critical"

def compute_hospital_accessibility(hospital_id: str, include_simulated: bool = False, now=None) -> dict[str, Any]:
    hospital = get_hospital_by_id(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital not found: {hospital_id}")

    access_junctions = get_hospital_access_junctions(hospital, n=2)
    
    penalties = []
    access_junctions_detail = []
    
    for j in access_junctions:
        health = compute_health_score(j["id"], include_simulated=include_simulated, now=now)
        effective_score = health["health_score"]
        penalty = 100 - effective_score
        penalties.append(penalty)
        
        access_junctions_detail.append({
            "junction_id": j["id"],
            "junction_name": j["name"],
            "effective_health_score": effective_score,
            "raw_penalty": penalty
        })

    N = len(access_junctions)
    avg_penalty = sum(penalties) / N if N > 0 else 0
    accessibility_score = max(0, min(100, int(round(100 - avg_penalty))))
    band = get_band(accessibility_score)

    for detail in access_junctions_detail:
        detail["contribution_to_penalty"] = int(round(detail["raw_penalty"] / N))
        del detail["raw_penalty"]

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
