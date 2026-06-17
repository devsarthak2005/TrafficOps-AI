from __future__ import annotations

from fastapi import APIRouter

from ..services.heatmap import get_heatmap_geojson

router = APIRouter()

@router.get("/heatmap/incidents.geojson")
def heatmap_geojson(include_simulated: bool = False) -> dict:
    """Return a GeoJSON FeatureCollection of all incidents for the heatmap layer."""
    return get_heatmap_geojson(include_simulated)
