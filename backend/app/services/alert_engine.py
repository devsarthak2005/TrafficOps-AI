from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from ..db import get_cursor
from .health_score import compute_health_score
from .gemini_client import generate_explanation
from .zones import JUNCTION_ZONES
from .resource_engine import recommend_resources
from .simulation_engine import get_active_simulations

logger = logging.getLogger(__name__)

# Detector Configs & Placeholder Maps
HOSPITAL_ADJACENT_JUNCTIONS = ["silk-board", "old-madras-road"]
ZONE_AVAILABLE_OFFICERS = {"North": 4, "East": 6, "Central": 5, "South": 8}

JUNCTION_ADJACENCY = {
    "silk-board": ["bellandur"],
    "bellandur": ["silk-board", "marathahalli-bridge"],
    "marathahalli-bridge": ["bellandur"],
    "kr-puram": ["tin-factory"],
    "tin-factory": ["kr-puram", "old-madras-road"],
    "old-madras-road": ["tin-factory", "mg-road"],
    "mg-road": ["old-madras-road"],
    "hebbal-flyover": [],
    "bellandur": ["silk-board", "marathahalli-bridge"]
}


def _get_junction_name_map() -> dict[str, str]:
    """Retrieve mapping of junction_id -> junction_name from DB."""
    with get_cursor() as cur:
        cur.execute("SELECT id, name FROM junctions")
        rows = cur.fetchall()
    return {row["id"]: row["name"] for row in rows}


def generate_alert_id(target_id: str, alert_type: str) -> str:
    """Generate a deterministic alert ID stable for a 15-minute window."""
    now = datetime.now(timezone.utc)
    rounded_minute = (now.minute // 15) * 15
    rounded_time = now.replace(minute=rounded_minute, second=0, microsecond=0)
    time_str = rounded_time.isoformat()
    
    raw_str = f"{target_id}:{alert_type}:{time_str}"
    h = hashlib.md5(raw_str.encode("utf-8")).hexdigest()
    return f"alert_{h[:8]}"


def detect_escalation_alerts(junctions: list[dict], name_map: dict[str, str]) -> list[dict]:
    """Detect junctions whose health score has dropped by > 15 points in the last hour."""
    alerts = []
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    for junction in junctions:
        j_id = junction["id"]
        j_name = name_map.get(j_id, j_id)

        curr_health = compute_health_score(j_id, include_simulated=True, now=now)
        past_health = compute_health_score(j_id, include_simulated=True, now=one_hour_ago)

        drop = past_health["health_score"] - curr_health["health_score"]
        if drop > 15:
            confidence = min(100, max(50, 50 + int(drop * 2)))
            minutes_likely = max(10, min(50, 60 - int(drop * 1.5)))

            prompt = (
                f"Explain to a traffic operator why there is an alert: Congestion escalation likely at {j_name} within "
                f"{minutes_likely} minutes because its health score dropped rapidly by {drop} points recently. "
                f"Keep the response to a single short sentence."
            )
            fallback = f"Congestion escalation likely at {j_name} within {minutes_likely} minutes due to a recent {drop}-point health score drop."
            message = generate_explanation(prompt, fallback)

            alerts.append({
                "alert_id": generate_alert_id(j_id, "escalation"),
                "alert_type": "escalation",
                "junction_id": j_id,
                "junction_name": j_name,
                "confidence": confidence,
                "message": message,
                "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return alerts


def detect_hospital_corridor_alerts(junctions: list[dict], name_map: dict[str, str]) -> list[dict]:
    """Detect critical/watchlist risk on known hospital-adjacent corridors."""
    alerts = []
    now = datetime.now(timezone.utc)

    for j_id in HOSPITAL_ADJACENT_JUNCTIONS:
        if j_id not in name_map:
            continue
        j_name = name_map[j_id]
        
        health = compute_health_score(j_id, include_simulated=True, now=now)
        risk_category = health["risk_category"]

        if risk_category in ("watchlist", "critical"):
            confidence = 90 if risk_category == "critical" else 75
            prompt = (
                f"Explain to a traffic operator why there is an alert: Hospital access corridor at risk. "
                f"{j_name} is currently at a {risk_category} risk level. Keep the response to a single short sentence."
            )
            fallback = f"Hospital access corridor at risk: {j_name} is currently at {risk_category} level."
            message = generate_explanation(prompt, fallback)

            alerts.append({
                "alert_id": generate_alert_id(j_id, "hospital_corridor"),
                "alert_type": "hospital_corridor",
                "junction_id": j_id,
                "junction_name": j_name,
                "confidence": confidence,
                "message": message,
                "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return alerts


def detect_officer_deficit_alerts(junctions: list[dict], name_map: dict[str, str]) -> list[dict]:
    """Detect if recommended officers in a zone exceed the available officer staff."""
    alerts = []
    now = datetime.now(timezone.utc)
    
    # 1. Sum up recommended officers per zone
    zone_recommendations = {}
    for junction in junctions:
        j_id = junction["id"]
        zone = JUNCTION_ZONES.get(j_id)
        if not zone:
            continue
        rec = recommend_resources(j_id)
        zone_recommendations[zone] = zone_recommendations.get(zone, 0) + rec["recommendation"]["officers"]

    # 2. Check for deficits against available staff
    for zone, recommended in zone_recommendations.items():
        available = ZONE_AVAILABLE_OFFICERS.get(zone, 0)
        if recommended > available:
            deficit = recommended - available
            confidence = min(100, max(50, 50 + deficit * 8))

            prompt = (
                f"Explain to a traffic operator why there is an alert: Officer deficit of {deficit} officers "
                f"detected in {zone} zone. Recommended officers: {recommended}, available: {available}. "
                f"Keep the response to a single short sentence."
            )
            fallback = f"Officer deficit of {deficit} officers detected in {zone} zone. Recommended: {recommended}, Available: {available}."
            message = generate_explanation(prompt, fallback)

            alerts.append({
                "alert_id": generate_alert_id(zone, "officer_deficit"),
                "alert_type": "officer_deficit",
                "confidence": confidence,
                "message": message,
                "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return alerts


def detect_event_readiness_alerts(junctions: list[dict], name_map: dict[str, str]) -> list[dict]:
    """Detect simulation active but resources recommended exceed deployed resources (assumed 0)."""
    alerts = []
    now = datetime.now(timezone.utc)
    simulations = get_active_simulations()

    for sim in simulations:
        target_type = sim.target_type
        target_id = sim.target_id
        
        # Calculate recommended assets for all affected junctions
        rec_officers = 0
        rec_barricades = 0
        for j_id in sim.affected_junction_ids:
            rec = recommend_resources(j_id)
            rec_officers += rec["recommendation"]["officers"]
            rec_barricades += rec["recommendation"]["barricades"]

        # Deficit/Readiness issue exists since recommended > 0 (deployed is 0)
        if rec_officers > 0 or rec_barricades > 0:
            confidence = 80 if sim.intensity == "low" else 90 if sim.intensity == "medium" else 95
            
            prompt = (
                f"Explain to a traffic operator why there is an alert: Event readiness issue in {target_id} "
                f"({target_type}) for {sim.event_type} simulation. Recommended resources ({rec_officers} officers, "
                f"{rec_barricades} barricades) exceed deployed resources (0). Keep the response to a single short sentence."
            )
            fallback = f"Event readiness alert for {target_id}: Simulated {sim.event_type} requires {rec_officers} officers and {rec_barricades} barricades, exceeding deployed resources (0)."
            message = generate_explanation(prompt, fallback)

            alerts.append({
                "alert_id": generate_alert_id(target_id, "event_readiness"),
                "alert_type": "event_readiness",
                "confidence": confidence,
                "message": message,
                "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return alerts


def detect_incident_spread_alerts(junctions: list[dict], name_map: dict[str, str]) -> list[dict]:
    """Detect if adjacent junctions are simultaneously at watchlist/critical levels."""
    alerts = []
    now = datetime.now(timezone.utc)
    
    # 1. Fetch risk status for all junctions
    junction_risks = {}
    for junction in junctions:
        j_id = junction["id"]
        health = compute_health_score(j_id, include_simulated=True, now=now)
        junction_risks[j_id] = health["risk_category"]

    processed_pairs = set()

    # 2. Check each junction's adjacencies
    for j_a, neighbors in JUNCTION_ADJACENCY.items():
        risk_a = junction_risks.get(j_a)
        if risk_a not in ("watchlist", "critical"):
            continue

        for j_b in neighbors:
            if j_b not in name_map:
                continue
            
            risk_b = junction_risks.get(j_b)
            if risk_b not in ("watchlist", "critical"):
                continue

            # Deduplicate pair
            pair = tuple(sorted([j_a, j_b]))
            if pair in processed_pairs:
                continue
            processed_pairs.add(pair)

            confidence = 85 if (risk_a == "critical" and risk_b == "critical") else 70
            name_a = name_map.get(j_a, j_a)
            name_b = name_map.get(j_b, j_b)

            prompt = (
                f"Explain to a traffic operator why there is an alert: High risk of incident spread between adjacent "
                f"junctions {name_a} and {name_b}, both currently at elevated risk levels ({risk_a} and {risk_b}). "
                f"Keep the response to a single short sentence."
            )
            fallback = f"Incident spread risk between {name_a} and {name_b} (both at {risk_a} / {risk_b} risk levels)."
            message = generate_explanation(prompt, fallback)

            alerts.append({
                "alert_id": generate_alert_id(f"{j_a}-{j_b}", "incident_spread"),
                "alert_type": "incident_spread",
                "junction_id": j_a,  # Primary affected junction
                "junction_name": name_a,
                "confidence": confidence,
                "message": message,
                "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return alerts


def get_active_alerts() -> list[dict]:
    """Run all five detectors fresh and return a combined list of active alerts sorted by confidence descending.

    Any alert with a confidence below 50% is filtered out.
    """
    # 1. Load basic junctions
    with get_cursor() as cur:
        cur.execute("SELECT id, name FROM junctions")
        junctions = cur.fetchall()

    name_map = {row["id"]: row["name"] for row in rows} if (rows := junctions) else {}

    # 2. Run all detectors
    all_alerts = []
    all_alerts.extend(detect_escalation_alerts(junctions, name_map))
    all_alerts.extend(detect_hospital_corridor_alerts(junctions, name_map))
    all_alerts.extend(detect_officer_deficit_alerts(junctions, name_map))
    all_alerts.extend(detect_event_readiness_alerts(junctions, name_map))
    all_alerts.extend(detect_incident_spread_alerts(junctions, name_map))

    # 3. Filter by confidence floor >= 50%
    filtered_alerts = [alert for alert in all_alerts if alert.get("confidence", 0) >= 50]

    # 4. Sort by confidence descending
    filtered_alerts.sort(key=lambda x: x["confidence"], reverse=True)

    return filtered_alerts
