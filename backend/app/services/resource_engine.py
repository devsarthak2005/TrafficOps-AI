from __future__ import annotations

from .health_score import compute_health_score
from .simulation_engine import get_simulation_overrides

# Placeholder diversion routes for the 8 standard junctions in Bengaluru
JUNCTION_DIVERSIONS = {
    "silk-board": ["Divert via Outer Ring Road", "Divert via Hosur Road"],
    "marathahalli-bridge": ["Divert via HAL Old Airport Road", "Divert via Panathur Main Road"],
    "hebbal-flyover": ["Divert via Outer Ring Road (West)", "Divert via Bellary Road Services"],
    "kr-puram": ["Divert via Whitefield Main Road", "Divert via OMR Bypass"],
    "tin-factory": ["Divert via Kasturi Nagar Main Road", "Divert via OMR Service Road"],
    "mg-road": ["Divert via Residency Road", "Divert via Brigade Road"],
    "old-madras-road": ["Divert via Indiranagar 100 Feet Road", "Divert via Suranjandas Road"],
    "bellandur": ["Divert via Sarjapur Road", "Divert via Deverabeesanahalli Flyover Service Road"],
}

# Fallback diversion routes if an unexpected junction ID is encountered
DEFAULT_DIVERSIONS = ["Divert via Alternative Service Lane", "Divert via Parallel Link Road"]


def recommend_resources(junction_id: str) -> dict:
    """Recommend traffic operations and safety resources based on current effective risk level.

    The risk level can be real (based on historical incidents) or simulated (escalated by
    an active simulation override).
    """
    # 1. Fetch current effective health score and risk category (including active simulations)
    health_info = compute_health_score(junction_id, include_simulated=True)
    risk_category = health_info["risk_category"]

    # 2. Check if this specific junction is currently simulated
    overrides = get_simulation_overrides()
    is_simulated = junction_id in overrides

    # 3. Retrieve placeholder diversion routes for this junction
    diversions = JUNCTION_DIVERSIONS.get(junction_id, DEFAULT_DIVERSIONS)

    # 4. Apply rule-based decision tree based on the effective risk category
    if risk_category == "healthy":
        recommendation = {
            "officers": 1,
            "barricades": 0,
            "patrol_vehicles": 0,
            "ambulances": 0,
            "diversion_routes": [],
        }
    elif risk_category == "moderate":
        recommendation = {
            "officers": 2,
            "barricades": 2,
            "patrol_vehicles": 1,
            "ambulances": 0,
            "diversion_routes": ["Monitor traffic flow closely; no active diversions required"],
        }
    elif risk_category == "watchlist":
        recommendation = {
            "officers": 4,
            "barricades": 4,
            "patrol_vehicles": 2,
            "ambulances": 1,
            "diversion_routes": [diversions[0]],
        }
    else:  # critical
        recommendation = {
            "officers": 6,
            "barricades": 6,
            "patrol_vehicles": 3,
            "ambulances": 2,
            "diversion_routes": [diversions[0], diversions[1]] if len(diversions) >= 2 else diversions,
        }

    return {
        "junction_id": junction_id,
        "risk_category": risk_category,
        "is_simulated": is_simulated,
        "recommendation": recommendation,
    }
