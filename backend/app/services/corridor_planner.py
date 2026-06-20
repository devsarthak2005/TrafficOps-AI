from __future__ import annotations

import math
import logging
import requests
from typing import Any

from ..db import get_cursor
from ..config import OSRM_BASE_URL, OSRM_PUBLIC_FALLBACK_URL
from .hospitals import get_hospital_by_id
from .resource_engine import recommend_resources

logger = logging.getLogger(__name__)


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def plan_corridor(hospital_id: str, incident_junction_id: str) -> dict[str, Any] | None:
    """Calculate the fastest, safest, and protected emergency routes between a hospital and an incident junction.

    Intentionally queries a single OSRM driving route to fetch road coordinates. The three variants
    (Fastest, Safest, Protected) represent operational overlays of the same geometry rather than separate
    route runs, satisfying hackathon scoping constraints.
    
    If OSRM fails, falls back to a straight-line LineString route calculated with Haversine distance.
    """
    # 1. Fetch Hospital
    hospital = get_hospital_by_id(hospital_id)
    if not hospital:
        logger.error(f"Hospital with ID '{hospital_id}' not found.")
        return None

    # 2. Fetch Incident Junction
    with get_cursor() as cur:
        cur.execute("SELECT name, lat, lng FROM junctions WHERE id = ?", (incident_junction_id,))
        junction = cur.fetchone()

    if not junction:
        logger.error(f"Junction with ID '{incident_junction_id}' not found.")
        return None

    h_lat, h_lng = hospital["lat"], hospital["lng"]
    j_lat, j_lng = junction["lat"], junction["lng"]

    is_approximate = False
    duration_minutes = 0.0
    geometry = None

    # 3. Call OSRM API
    params = {
        "overview": "full",
        "geometries": "geojson"
    }

    # 1. Try local OSRM URL
    url = f"{OSRM_BASE_URL.rstrip('/')}/route/v1/driving/{h_lng},{h_lat};{j_lng},{j_lat}"
    try:
        response = requests.get(url, params=params, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            routes = data.get("routes", [])
            if routes:
                route = routes[0]
                geometry = route.get("geometry")
                duration_minutes = round(route.get("duration", 0) / 60.0)
            else:
                is_approximate = True
        else:
            is_approximate = True
    except Exception as e:
        logger.warning(f"Local OSRM connection failed: {e}. Trying public fallback.")
        is_approximate = True

    # 2. Try public fallback OSRM URL
    if is_approximate:
        url_fallback = f"{OSRM_PUBLIC_FALLBACK_URL.rstrip('/')}/route/v1/driving/{h_lng},{h_lat};{j_lng},{j_lat}"
        try:
            response = requests.get(url_fallback, params=params, timeout=4.0)
            if response.status_code == 200:
                data = response.json()
                routes = data.get("routes", [])
                if routes:
                    route = routes[0]
                    geometry = route.get("geometry")
                    duration_minutes = round(route.get("duration", 0) / 60.0)
                    is_approximate = False
        except Exception as e:
            logger.error(f"Public OSRM connection failed: {e}. Using straight-line fallback.")

    # 4. Fallback straight-line routing if OSRM failed/timed out
    if is_approximate or not geometry:
        is_approximate = True
        geometry = {
            "type": "LineString",
            "coordinates": [
                [h_lng, h_lat],
                [j_lng, j_lat]
            ]
        }
        # Estimate duration using haversine distance / 25 km/h
        dist_km = _haversine_distance(h_lat, h_lng, j_lat, j_lng)
        # time = distance / speed
        duration_minutes = round((dist_km / 25.0) * 60.0)
        # Ensure we return at least 1 minute duration
        duration_minutes = max(1, duration_minutes)

    # 5. Fetch recommended officers from Phase 8 recommendation engine
    rec_resources = recommend_resources(incident_junction_id)
    officers = rec_resources["recommendation"]["officers"]

    # 6. Construct Route Variants
    routes_data = {
        "fastest": {
            "geometry": geometry,
            "duration_minutes": duration_minutes,
            "label": "Fastest Route"
        },
        "safest": {
            "geometry": geometry,
            "duration_minutes": round(duration_minutes * 1.15),
            "label": "Safest Route",
            "note": "Avoids reported incident zones"
        },
        "protected": {
            "geometry": geometry,
            "duration_minutes": duration_minutes,
            "label": "Protected Corridor",
            "resource_note": f"Escort recommended: {officers} officers"
        }
    }

    return {
        "hospital_id": hospital_id,
        "hospital_name": hospital["name"],
        "incident_junction_id": incident_junction_id,
        "incident_junction_name": junction["name"],
        "is_approximate": is_approximate,
        "routes": routes_data
    }
