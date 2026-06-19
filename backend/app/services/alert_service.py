from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

from ..db import get_cursor
from ..schemas.alert import AlertPayload
from .simulation_engine import get_active_simulations
from .resource_engine import recommend_resources
from .zones import JUNCTION_ZONES

logger = logging.getLogger(__name__)

ZONE_AVAILABLE_OFFICERS = {"North": 4, "East": 6, "Central": 5, "South": 8}
HOSPITAL_ADJACENT_JUNCTIONS = ["silk-board", "old-madras-road"]


def get_alerts_from_db(severity: Optional[str] = None, status: Optional[str] = None) -> List[AlertPayload]:
    """Retrieve filtered alerts from the SQLite database."""
    query = "SELECT alert_id, severity, title, description, confidence, created_at, status FROM alerts"
    params = []
    conditions = []

    if severity:
        conditions.append("severity = ?")
        params.append(severity)
    if status:
        conditions.append("status = ?")
        params.append(status)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY created_at DESC"

    with get_cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [
        AlertPayload(
            alert_id=row["alert_id"],
            severity=row["severity"],
            title=row["title"],
            description=row["description"],
            confidence=row["confidence"],
            created_at=row["created_at"],
            status=row["status"]
        )
        for row in rows
    ]


def save_alert_to_db(alert: AlertPayload) -> None:
    """Save or update alert in database."""
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO alerts (alert_id, severity, title, description, confidence, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(alert_id) DO UPDATE SET
                severity=excluded.severity,
                title=excluded.title,
                description=excluded.description,
                confidence=excluded.confidence,
                status=alerts.status -- keep status unchanged if exists
            """,
            (alert.alert_id, alert.severity, alert.title, alert.description, alert.confidence, alert.created_at, alert.status)
        )


def generate_predictive_alerts() -> List[AlertPayload]:
    """Check active simulations and generate proactive Level 1, 2, 3 alerts in database."""
    sims = get_active_simulations()
    now_str = datetime.now(timezone.utc).isoformat()
    generated_alerts = []

    for sim in sims:
        sim_id = sim.simulation_id
        intensity = sim.intensity
        target_id = sim.target_id.replace("-", " ").title()

        # Map intensity to Impact levels & severity/colors
        # Level 1: Watch (Medium Impact, Conf > 60%)
        # Level 2: Warning (High Impact, Conf > 70%)
        # Level 3: Critical (Critical Impact, Conf > 80%)
        if intensity == "low":
            severity = "Watch"
            confidence = 65.0
            impact = "Medium"
        elif intensity == "medium":
            severity = "Warning"
            confidence = 78.0
            impact = "High"
        else:  # high
            severity = "Critical"
            confidence = 88.0
            impact = "Critical"

        # 1. Generate Predicted Congestion Alert
        congestion_alert = AlertPayload(
            alert_id=f"alert_congestion_{sim_id}",
            severity=severity,
            title="Predicted Congestion Alert",
            description=f"{impact} impact congestion expected near {target_id} due to active event simulation.",
            confidence=confidence,
            created_at=now_str,
            status="active"
        )
        save_alert_to_db(congestion_alert)
        generated_alerts.append(congestion_alert)

        # 2. Risk Escalation Warning (for Critical/High simulation cases)
        if intensity in ["medium", "high"]:
            escalation_alert = AlertPayload(
                alert_id=f"alert_escalation_{sim_id}",
                severity="Critical" if intensity == "high" else "Warning",
                title="Risk Escalation Warning",
                description=f"Rapid congestion buildup expected. Health score predicted to fall rapidly at {target_id}.",
                confidence=confidence + 5,
                created_at=now_str,
                status="active"
            )
            save_alert_to_db(escalation_alert)
            generated_alerts.append(escalation_alert)

        # 3. Resource Shortage Alert (check officer availability against recommendations)
        total_rec_officers = 0
        zone = "Central"
        for j_id in sim.affected_junction_ids:
            rec = recommend_resources(j_id)
            total_rec_officers += rec["recommendation"]["officers"]
            zone = JUNCTION_ZONES.get(j_id, zone)

        available_officers = ZONE_AVAILABLE_OFFICERS.get(zone, 5)
        if total_rec_officers > available_officers:
            shortage = total_rec_officers - available_officers
            resource_alert = AlertPayload(
                alert_id=f"alert_resource_{sim_id}",
                severity="Critical" if shortage > 5 else "Warning",
                title="Resource Shortage Alert",
                description=f"Zone {zone} lacks {shortage} officers to handle simulation. Required: {total_rec_officers}, Available: {available_officers}.",
                confidence=min(95.0, confidence + 10),
                created_at=now_str,
                status="active"
            )
            save_alert_to_db(resource_alert)
            generated_alerts.append(resource_alert)

        # 4. Emergency Corridor Alert
        has_hospital_junc = any(j_id in HOSPITAL_ADJACENT_JUNCTIONS for j_id in sim.affected_junction_ids)
        if has_hospital_junc:
            corridor_alert = AlertPayload(
                alert_id=f"alert_corridor_{sim_id}",
                severity="Critical",
                title="Emergency Corridor Alert",
                description=f"Emergency route to nearby trauma center passes through affected junction {target_id}. Immediate activation of emergency lane required.",
                confidence=95.0,
                created_at=now_str,
                status="active"
            )
            save_alert_to_db(corridor_alert)
            generated_alerts.append(corridor_alert)

    return generated_alerts


def acknowledge_alert(alert_id: str) -> bool:
    """Mark alert as acknowledged."""
    with get_cursor() as cur:
        cur.execute("UPDATE alerts SET status = 'acknowledged' WHERE alert_id = ?", (alert_id,))
        success = cur.rowcount > 0
    return success


def resolve_alert(alert_id: str) -> bool:
    """Mark alert as resolved."""
    with get_cursor() as cur:
        cur.execute("UPDATE alerts SET status = 'resolved' WHERE alert_id = ?", (alert_id,))
        success = cur.rowcount > 0
    return success
