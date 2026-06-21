"""Dashboard statistics aggregation service.

Computes every dashboard KPI from real data sources:
- Incident type distribution from SQLite
- Hourly incident distribution from SQLite
- Zone risk levels from health score engine
- Resource utilization from resource engine recommendations
- ML accuracy from learning feedback dataset
- Average response time from persisted close/resolution timestamps
- City intelligence (worst junction, highest risk zone, active hotspots)
"""

from __future__ import annotations

import logging
import pandas as pd

from ..db import get_cursor
from .health_score import compute_health_score
from .simulation_engine import get_active_simulations
from .zones import JUNCTION_ZONES, ZONES
from .resource_engine import recommend_resources

logger = logging.getLogger(__name__)


def _get_incident_type_distribution() -> list[dict]:
    """Query actual incident type counts from the database."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT incident_type, COUNT(*) as cnt FROM incidents GROUP BY incident_type ORDER BY cnt DESC"
        )
        rows = cur.fetchall()

    if not rows:
        return []

    total = sum(row["cnt"] for row in rows)
    result = []
    for row in rows:
        pct = round((row["cnt"] / total) * 100) if total > 0 else 0
        # Human-readable name
        name_map = {
            "congestion": "Congestion",
            "breakdown": "Breakdowns",
            "construction": "Road Works",
            "accident": "Accidents",
            "waterlogging": "Waterlogging",
        }
        name = name_map.get(row["incident_type"], row["incident_type"].replace("_", " ").title())
        result.append({
            "name": name,
            "count": row["cnt"],
            "pct": pct,
        })

    return result


def _get_hourly_incident_distribution() -> list[int]:
    """Return a 24-element array of incident counts per hour of day."""
    with get_cursor() as cur:
        cur.execute("SELECT timestamp FROM incidents")
        rows = cur.fetchall()

    hourly = [0] * 24
    for row in rows:
        try:
            ts = pd.to_datetime(row["timestamp"], utc=True)
            hourly[ts.hour] += 1
        except Exception:
            pass

    return hourly


def _get_avg_clearance_minutes() -> float:
    """Compute average clearance time from persisted start/end timestamps.

    Very long historical rows are treated as data-quality outliers and are
    excluded from the operational average so the KPI reflects response times
    rather than archival noise.
    """
    max_reasonable_minutes = 12 * 60
    with get_cursor() as cur:
        cur.execute("SELECT timestamp, closed_datetime, resolved_datetime FROM incidents")
        rows = cur.fetchall()

    durations: list[float] = []
    for row in rows:
        start = pd.to_datetime(row["timestamp"], errors="coerce", utc=True)
        if pd.isna(start):
            continue

        end_raw = row["closed_datetime"]
        if pd.isna(end_raw) or not end_raw:
            end_raw = row["resolved_datetime"]
        end = pd.to_datetime(end_raw, errors="coerce", utc=True) if end_raw is not None else pd.NaT
        if pd.isna(end):
            continue

        duration_minutes = (end - start).total_seconds() / 60.0
        if 0 <= duration_minutes <= max_reasonable_minutes:
            durations.append(duration_minutes)

    if not durations:
        return 0.0

    return round(sum(durations) / len(durations), 1)


def _get_avg_response_time_minutes() -> float:
    """Expose the response benchmark under the plan's preferred naming."""
    return _get_avg_clearance_minutes()


def _get_ml_accuracy() -> float:
    """Read ML prediction accuracy from the learning feedback dataset."""
    try:
        from .learning_service import FEEDBACK_CSV_PATH, initialize_feedback_dataset
        initialize_feedback_dataset()

        df = pd.read_csv(FEEDBACK_CSV_PATH)
        if df.empty:
            return 0.0

        df["prediction_correct"] = pd.to_numeric(df["prediction_correct"], errors="coerce")
        return round(float(df["prediction_correct"].mean() * 100), 1)
    except Exception as e:
        logger.error(f"Failed to compute ML accuracy from feedback: {e}")
        return 0.0


def _get_resource_utilization() -> list[dict]:
    """Sum resource recommendations across all junctions and compute utilization percentages."""
    # Total capacity estimates (based on zone staffing)
    total_officers_capacity = 700
    total_vehicles_capacity = 80
    total_barricades_capacity = 500

    total_officers = 0
    total_vehicles = 0
    total_barricades = 0

    with get_cursor() as cur:
        cur.execute("SELECT id FROM junctions")
        junction_rows = cur.fetchall()

    for row in junction_rows:
        rec = recommend_resources(row["id"])
        recommendation = rec["recommendation"]
        total_officers += recommendation["officers"]
        total_vehicles += recommendation["patrol_vehicles"]
        total_barricades += recommendation["barricades"]

    officers_pct = min(100, round((total_officers / total_officers_capacity) * 100)) if total_officers_capacity > 0 else 0
    vehicles_pct = min(100, round((total_vehicles / total_vehicles_capacity) * 100)) if total_vehicles_capacity > 0 else 0
    barricades_pct = min(100, round((total_barricades / total_barricades_capacity) * 100)) if total_barricades_capacity > 0 else 0

    return [
        {"label": "Officers Deployed", "pct": officers_pct, "desc": f"{total_officers} / {total_officers_capacity} active"},
        {"label": "Patrol Cars Active", "pct": vehicles_pct, "desc": f"{total_vehicles} / {total_vehicles_capacity} on route"},
        {"label": "Barricades Dispatched", "pct": barricades_pct, "desc": f"{total_barricades} / {total_barricades_capacity} placed"},
    ]


def _get_zone_risk_levels() -> list[dict]:
    """Compute zone risk as average inverse health score across each zone's junctions."""
    zone_junctions: dict[str, list[str]] = {z: [] for z in ZONES}
    for j_id, zone in JUNCTION_ZONES.items():
        if zone in zone_junctions:
            zone_junctions[zone].append(j_id)

    results = []
    for zone in ZONES:
        j_ids = zone_junctions[zone]
        if not j_ids:
            results.append({"zone": zone, "risk": 0})
            continue

        health_scores = []
        for j_id in j_ids:
            h = compute_health_score(j_id, include_simulated=True)
            health_scores.append(h["health_score"])

        avg_health = sum(health_scores) / len(health_scores)
        # Risk is inverse of health: health 100 → risk 0, health 0 → risk 100
        risk = max(0, min(100, round(100 - avg_health)))
        results.append({"zone": zone, "risk": risk})

    # Sort by risk descending
    results.sort(key=lambda x: x["risk"], reverse=True)
    return results


def _get_active_event_hotspots(active_simulations: list | None = None) -> list[dict]:
    """Summarize zones with currently active simulations."""
    if active_simulations is None:
        active_simulations = get_active_simulations()
    if not active_simulations:
        return []

    zone_counts: dict[str, int] = {}
    for sim in active_simulations:
        zones: set[str] = set()
        if sim.target_type == "zone":
            zones.add(sim.target_id)
        else:
            zone = JUNCTION_ZONES.get(sim.target_id)
            if zone:
                zones.add(zone)
        for zone in zones:
            zone_counts[zone] = zone_counts.get(zone, 0) + 1

    return [
        {"zone_name": zone, "simulation_count": count}
        for zone, count in sorted(zone_counts.items(), key=lambda item: item[1], reverse=True)
    ]


def _get_city_intelligence(zone_risks: list[dict] | None = None) -> dict:
    """Compute city intelligence overview from real data."""
    if zone_risks is None:
        zone_risks = _get_zone_risk_levels()
    active_simulations = get_active_simulations()

    # 1. Find the worst junction (lowest health)
    with get_cursor() as cur:
        cur.execute("SELECT id, name FROM junctions")
        junctions = cur.fetchall()

    worst_junction_name = "N/A"
    worst_health = 101
    highest_risk_zone = "N/A"
    highest_risk_category = "healthy"

    for j in junctions:
        h = compute_health_score(j["id"], include_simulated=True)
        if h["health_score"] < worst_health:
            worst_health = h["health_score"]
            worst_junction_name = j["name"]
            highest_risk_category = h["risk_category"]

    # 2. Highest risk zone
    if zone_risks:
        highest_risk_zone = zone_risks[0]["zone"]
        hr_risk_pct = zone_risks[0]["risk"]
    else:
        hr_risk_pct = 0

    # 3. Active incidents count
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM incidents")
        total_incidents = cur.fetchone()["cnt"]

    return {
        "highest_risk_zone": highest_risk_zone,
        "highest_risk_zone_pct": hr_risk_pct,
        "worst_junction": worst_junction_name,
        "worst_junction_category": highest_risk_category.replace("_", " ").title(),
        "total_incidents": total_incidents,
        "active_simulation_hotspots": _get_active_event_hotspots(active_simulations),
        "active_simulation_count": len(active_simulations),
    }


def compute_city_intelligence() -> dict:
    """Return only the city intelligence slice of the dashboard stats."""
    return _get_city_intelligence()


def compute_dashboard_stats() -> dict:
    """Compute all dashboard statistics from real data sources.

    Returns a comprehensive dict with all KPIs needed by both the Dashboard and Analytics views.
    """
    zone_risks = _get_zone_risk_levels()
    avg_response_time_minutes = _get_avg_clearance_minutes()

    return {
        "incident_type_distribution": _get_incident_type_distribution(),
        "hourly_incident_distribution": _get_hourly_incident_distribution(),
        "avg_clearance_minutes": avg_response_time_minutes,
        "avg_response_time_minutes": avg_response_time_minutes,
        "ml_accuracy_pct": _get_ml_accuracy(),
        "resource_utilization": _get_resource_utilization(),
        "zone_risk_levels": zone_risks,
        "city_intelligence": _get_city_intelligence(zone_risks),
    }
