"""Generate synthetic incident data for demo purposes.

Produces ~500 incident rows across 8 Bengaluru junctions, randomly
distributed over a 48-hour window ending at the current time. The RNG
is seeded for deterministic, rerunnable output.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

import pandas as pd

# The 8 Phase 2 junctions with their static metadata.
JUNCTIONS = [
    {"id": "silk-board",          "name": "Silk Board Junction",     "lat": 12.9176, "lng": 77.6229, "road_type": "arterial"},
    {"id": "marathahalli-bridge", "name": "Marathahalli Bridge",     "lat": 12.9592, "lng": 77.6974, "road_type": "arterial"},
    {"id": "hebbal-flyover",      "name": "Hebbal Flyover",          "lat": 13.0358, "lng": 77.5970, "road_type": "highway"},
    {"id": "kr-puram",            "name": "KR Puram Junction",       "lat": 13.0095, "lng": 77.6958, "road_type": "arterial"},
    {"id": "tin-factory",         "name": "Tin Factory Junction",    "lat": 12.9887, "lng": 77.6615, "road_type": "arterial"},
    {"id": "mg-road",             "name": "MG Road Junction",        "lat": 12.9754, "lng": 77.6095, "road_type": "collector"},
    {"id": "old-madras-road",     "name": "Old Madras Road Junction","lat": 12.9908, "lng": 77.6579, "road_type": "arterial"},
    {"id": "bellandur",           "name": "Bellandur Junction",      "lat": 12.9352, "lng": 77.6798, "road_type": "arterial"},
]

INCIDENT_TYPES = ["accident", "breakdown", "construction", "waterlogging", "congestion"]
SEVERITIES = ["low", "moderate", "high", "critical"]
WEATHER_CONDITIONS = ["clear", "rain", "heavy_rain", "fog"]

# Severity weights: moderate/low are common, critical is rare (~5%).
_SEVERITY_WEIGHTS = [0.30, 0.40, 0.20, 0.10]

# Incident type weights
_INCIDENT_TYPE_WEIGHTS = [0.15, 0.20, 0.10, 0.15, 0.40]

# Weather weights
_WEATHER_WEIGHTS = [0.50, 0.25, 0.15, 0.10]

_RECOVERY_WINDOW_MINUTES = {
    "low": (10, 25),
    "moderate": (20, 45),
    "high": (35, 90),
    "critical": (60, 180),
}

# Description templates per incident type
_DESCRIPTIONS: dict[str, list[str]] = {
    "accident": [
        "Two-vehicle collision blocking left lane",
        "Multi-vehicle pileup causing major delays",
        "Minor fender bender on shoulder",
        "Motorcycle accident near junction center",
        "Rear-end collision in slow-moving traffic",
    ],
    "breakdown": [
        "Stalled truck blocking inner lane",
        "Bus breakdown causing partial lane closure",
        "Vehicle engine failure in middle lane",
        "Auto-rickshaw breakdown near signal",
        "Heavy vehicle tyre burst on main carriageway",
    ],
    "construction": [
        "Scheduled road resurfacing in progress",
        "Metro construction zone active",
        "Water pipeline repair work underway",
        "Road widening project blocking one lane",
        "Footpath construction causing lane narrowing",
    ],
    "waterlogging": [
        "Severe waterlogging after heavy rainfall",
        "Water accumulation reducing road to single lane",
        "Stormwater drain overflow flooding road surface",
        "Knee-deep water on main carriageway",
        "Moderate waterlogging slowing traffic",
    ],
    "congestion": [
        "Heavy peak-hour congestion",
        "Signal malfunction causing traffic buildup",
        "Unusual congestion due to nearby event",
        "Slow-moving traffic extending 2 km",
        "Rush hour gridlock at junction",
    ],
}


def generate_synthetic_incidents(count: int = 500) -> pd.DataFrame:
    """Generate *count* synthetic incident rows.

    Returns a DataFrame with columns matching the incidents table schema.
    """
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=48)

    rows: list[dict] = []
    for i in range(count):
        junction = rng.choice(JUNCTIONS)
        incident_type = rng.choices(INCIDENT_TYPES, weights=_INCIDENT_TYPE_WEIGHTS, k=1)[0]
        severity = rng.choices(SEVERITIES, weights=_SEVERITY_WEIGHTS, k=1)[0]
        weather = rng.choices(WEATHER_CONDITIONS, weights=_WEATHER_WEIGHTS, k=1)[0]

        # Random timestamp within the 48-hour window
        offset_seconds = rng.uniform(0, 48 * 3600)
        ts = window_start + timedelta(seconds=offset_seconds)

        # Temperature varies by weather
        if weather in ("rain", "heavy_rain"):
            temp = round(rng.uniform(18.0, 26.0), 1)
        elif weather == "fog":
            temp = round(rng.uniform(14.0, 22.0), 1)
        else:
            temp = round(rng.uniform(24.0, 38.0), 1)

        description = rng.choice(_DESCRIPTIONS[incident_type])
        recovery_min, recovery_max = _RECOVERY_WINDOW_MINUTES[severity]
        duration_minutes = rng.randint(recovery_min, recovery_max)
        closed_dt = ts + timedelta(minutes=duration_minutes)

        rows.append({
            "id": f"inc_{uuid.UUID(int=rng.getrandbits(128)).hex[:12]}",
            "junction_id": junction["id"],
            "incident_type": incident_type,
            "severity": severity,
            "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "closed_datetime": closed_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "resolved_datetime": closed_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "weather": weather,
            "temperature_c": temp,
            "description": description,
        })

    df = pd.DataFrame(rows)
    return df
