"""Heatmap generation service.

Builds a GeoJSON FeatureCollection from recent incident data, directly feeding
the Mapbox GL heatmap layer.
"""

from __future__ import annotations

from ..db import get_cursor
from .simulation_engine import get_active_simulations

# Map severity to weight for the heatmap density.
_SEVERITY_WEIGHT = {
    "low": 1,
    "moderate": 2,
    "high": 3,
    "critical": 5,
}

def get_heatmap_geojson(include_simulated: bool = False) -> dict:
    """Return a GeoJSON FeatureCollection of all incidents.
    If include_simulated is True, dynamically injects temporary high-weight points
    at junctions currently affected by active simulations.
    """
    # We join incidents to junctions to get lat/lng
    query = """
        SELECT i.severity, j.lat, j.lng
        FROM incidents i
        JOIN junctions j ON i.junction_id = j.id
    """
    with get_cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    features = []
    for row in rows:
        severity = row["severity"]
        weight = _SEVERITY_WEIGHT.get(severity, 1)
        
        # GeoJSON Point coordinates are [longitude, latitude]
        features.append({
            "type": "Feature",
            "properties": {
                "weight": weight,
                "severity": severity,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [row["lng"], row["lat"]],
            }
        })

    # Dynamically inject simulated incidents if requested
    if include_simulated:
        # Get coordinates for all junctions to inject points
        cur_j = get_cursor()
        with cur_j as cur:
            cur.execute("SELECT id, lat, lng FROM junctions")
            j_rows = cur.fetchall()
            junction_coords = {r["id"]: (r["lng"], r["lat"]) for r in j_rows}
            
        active_sims = get_active_simulations()
        for sim in active_sims:
            # Map intensity to a high weight to make the heatmap glow intensely
            sim_weight = 5 if sim.intensity == "high" else (4 if sim.intensity == "medium" else 3)
            for j_id in sim.affected_junction_ids:
                if j_id in junction_coords:
                    # Inject 3 points per junction to ensure visual intensity pop
                    for _ in range(3):
                        features.append({
                            "type": "Feature",
                            "properties": {
                                "weight": sim_weight,
                                "severity": "critical",  # visuals use this
                                "is_simulated": True
                            },
                            "geometry": {
                                "type": "Point",
                                "coordinates": junction_coords[j_id],
                            }
                        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }
