from __future__ import annotations

from typing import Dict, Any, List
from pydantic import BaseModel

class ZoneRiskRequest(BaseModel):
    zone: str
    junction: str
    event_type: str
    priority: str
    severity: str
    escalation_risk: float
    historical_frequency: int
    recovery_time: float

class ZoneRiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    risk_heatmap_color: str
    critical_junctions: List[str]

def predict_zone_risk(req: ZoneRiskRequest) -> ZoneRiskResponse:
    """
    Computes a dynamic risk score (0-100) for a given zone incorporating active event parameters,
    escalation probability, recovery delays, and historical frequencies.
    """
    # 1. Base Score calculation
    severity_map = {
        "critical": 40.0,
        "high": 30.0,
        "medium": 15.0,
        "low": 5.0
    }
    priority_map = {
        "high": 15.0,
        "medium": 8.0,
        "low": 2.0
    }

    base_pts = severity_map.get(req.severity.lower(), 5.0)
    priority_pts = priority_map.get(req.priority.lower(), 2.0)
    
    # Escalation multiplier (escalation risk: 0.0 - 1.0)
    escalation_pts = req.escalation_risk * 25.0
    
    # Historical frequency (e.g. number of events, capped at 10)
    freq_pts = min(req.historical_frequency, 10) * 1.5
    
    # Recovery time penalty (minutes delayed, e.g. 100 mins -> 10 pts)
    recovery_pts = min(req.recovery_time / 10.0, 10.0)

    raw_score = base_pts + priority_pts + escalation_pts + freq_pts + recovery_pts
    risk_score = round(min(100.0, max(0.0, raw_score)), 1)

    # 2. Risk Level & Heatmap Color Mapping
    if risk_score >= 85.0:
        risk_level = "Critical"
        risk_heatmap_color = "#EF4444"  # Red
    elif risk_score >= 70.0:
        risk_level = "High"
        risk_heatmap_color = "#F97316"  # Orange
    elif risk_score >= 50.0:
        risk_level = "Medium"
        risk_heatmap_color = "#F59E0B"  # Yellow
    else:
        risk_level = "Low"
        risk_heatmap_color = "#10B981"  # Green

    # Get critical junctions in the zone
    zone_junction_map = {
        "North": ["hebbal-flyover"],
        "East": ["kr-puram", "tin-factory", "old-madras-road"],
        "Central": ["mg-road"],
        "South": ["silk-board", "bellandur", "marathahalli-bridge"]
    }
    critical_junctions = zone_junction_map.get(req.zone, [])

    return ZoneRiskResponse(
        risk_score=risk_score,
        risk_level=risk_level,
        risk_heatmap_color=risk_heatmap_color,
        critical_junctions=critical_junctions
    )
