"""Zone mapping and status service.

Provides a simplified, static mapping of junctions to city zones,
and aggregates health scores to determine the overall risk category
for each zone.
"""

from __future__ import annotations

from .health_score import compute_health_score

# Static mapping of junction IDs to their geographic zones.
# NOTE: This is a simplification for the prototype. In production,
# this would be determined by checking if junction coordinates fall
# within GeoPandas zone polygons.
JUNCTION_ZONES: dict[str, str] = {
    "hebbal-flyover": "North",
    "kr-puram": "East",
    "tin-factory": "East",
    "old-madras-road": "East",
    "mg-road": "Central",
    "silk-board": "South",
    "bellandur": "South",
    "marathahalli-bridge": "South",
}

# The 4 zones in order of presentation
ZONES = ["North", "East", "Central", "South"]

# Ordinal ranking for risk categories to compute the "worst" case.
_RISK_RANK = {
    "critical": 0,
    "watchlist": 1,
    "moderate": 2,
    "healthy": 3,
}

_RANK_TO_RISK = {v: k for k, v in _RISK_RANK.items()}


def get_zone_status(include_simulated: bool = False) -> list[dict]:
    """Compute the worst-case health category for each zone.

    A zone is only as healthy as its worst junction. Returns a list of dicts:
    [{"zone_name": str, "risk_category": str, "junction_count": int}, ...]
    """
    # Group junctions by zone
    zone_junctions: dict[str, list[str]] = {z: [] for z in ZONES}
    for j_id, zone in JUNCTION_ZONES.items():
        if zone in zone_junctions:
            zone_junctions[zone].append(j_id)

    results = []
    for zone in ZONES:
        j_ids = zone_junctions[zone]
        
        # If a zone has no junctions, default to healthy
        if not j_ids:
            results.append({
                "zone_name": zone,
                "risk_category": "healthy",
                "junction_count": 0,
            })
            continue

        worst_rank = _RISK_RANK["healthy"]
        
        for j_id in j_ids:
            health = compute_health_score(j_id, include_simulated)
            cat = health["risk_category"]
            rank = _RISK_RANK.get(cat, 0)
            if rank < worst_rank:
                worst_rank = rank
                
        results.append({
            "zone_name": zone,
            "risk_category": _RANK_TO_RISK[worst_rank],
            "junction_count": len(j_ids),
        })

    return results
