from __future__ import annotations

from typing import List


def get_recommendations(predicted_impact: str) -> List[str]:
    """
    Returns operational recommendations based on the predicted impact level.
    """
    impact = predicted_impact.lower()

    if impact == "low":
        return [
            "Deploy standard patrol (1 vehicle)",
            "No traffic diversions required",
            "No barricades required"
        ]
    elif impact == "medium":
        return [
            "Deploy 2 patrol vehicles and 4 traffic officers",
            "Implement minor localized diversions if bottleneck occurs",
            "Deploy standard barricades at the junction entrance"
        ]
    elif impact == "high":
        return [
            "Deploy 4 patrol vehicles and 10 traffic officers",
            "Implement major arterial diversion plan",
            "Deploy heavy barricading at junction approaches",
            "Notify nearest hospital corridor to prepare for potential delays"
        ]
    elif impact == "critical":
        return [
            "Deploy 8 patrol vehicles and 20+ traffic officers",
            "Activate full zone perimeter lockdown and route clearing",
            "Emergency Corridor Activation: Prepare corridors for transit",
            "Broadcast proactive public alert via dashboard and SMS"
        ]
    else:
        return [
            "Monitor junction activity closely",
            "Deploy standard patrol if congestion develops"
        ]
