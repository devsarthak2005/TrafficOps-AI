from __future__ import annotations

import math
import logging
import requests
from typing import List, Dict, Any, Tuple

from ..db import get_cursor
from ..config import OSRM_BASE_URL, OSRM_PUBLIC_FALLBACK_URL, JUNCTION_CLASSIFICATIONS
from ..schemas.diversion import DiversionRequest, DiversionResponse, RouteMetric

logger = logging.getLogger(__name__)


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _get_start_end_junctions(event_junc_id: str) -> Tuple[str, str]:
    """Return default traffic flow origin/destination pair for the event junction."""
    zone_map = {
        "silk-board": ("bellandur", "mg-road"),
        "bellandur": ("marathahalli-bridge", "silk-board"),
        "marathahalli-bridge": ("bellandur", "kr-puram"),
        "hebbal-flyover": ("mg-road", "kr-puram"),
        "kr-puram": ("tin-factory", "marathahalli-bridge"),
        "tin-factory": ("old-madras-road", "kr-puram"),
        "old-madras-road": ("tin-factory", "mg-road"),
        "mg-road": ("silk-board", "hebbal-flyover")
    }
    return zone_map.get(event_junc_id.lower(), ("silk-board", "hebbal-flyover"))


def _query_osrm_route(coords: List[Tuple[float, float]]) -> Tuple[List[List[float]], float, float, bool]:
    """
    Query OSRM driving route for coordinates in order.
    Returns: (path list of [lat, lng], distance in km, duration in minutes, is_approximate)
    """
    # coords should be list of (lat, lng)
    formatted_coords = ";".join([f"{lng},{lat}" for lat, lng in coords])
    params = {
        "overview": "full",
        "geometries": "geojson"
    }

    # 1. Try local OSRM URL
    url = f"{OSRM_BASE_URL.rstrip('/')}/route/v1/driving/{formatted_coords}"
    try:
        response = requests.get(url, params=params, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            routes = data.get("routes", [])
            if routes:
                route = routes[0]
                geometry = route.get("geometry")
                path_coords = [[pt[1], pt[0]] for pt in geometry.get("coordinates", [])]
                distance_km = route.get("distance", 0) / 1000.0
                duration_min = route.get("duration", 0) / 60.0
                return path_coords, distance_km, duration_min, False
    except Exception as e:
        logger.warning(f"Local OSRM query failed: {e}. Trying public fallback.")

    # 2. Try public fallback OSRM URL
    url_fallback = f"{OSRM_PUBLIC_FALLBACK_URL.rstrip('/')}/route/v1/driving/{formatted_coords}"
    try:
        response = requests.get(url_fallback, params=params, timeout=4.0)
        if response.status_code == 200:
            data = response.json()
            routes = data.get("routes", [])
            if routes:
                route = routes[0]
                geometry = route.get("geometry")
                path_coords = [[pt[1], pt[0]] for pt in geometry.get("coordinates", [])]
                distance_km = route.get("distance", 0) / 1000.0
                duration_min = route.get("duration", 0) / 60.0
                return path_coords, distance_km, duration_min, False
    except Exception as e:
        logger.error(f"Public OSRM query failed: {e}. Using straight-line fallback.")

    # Fallback straight-line coordinates
    path_coords = [[lat, lng] for lat, lng in coords]
    total_dist = 0.0
    for i in range(len(coords) - 1):
        total_dist += _haversine_distance(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    
    # Estimate at 30 km/h
    duration_min = (total_dist / 30.0) * 60.0
    return path_coords, total_dist, max(1.0, duration_min), True


def plan_diversion_routes(req: DiversionRequest) -> DiversionResponse:
    """
    Generate impact-aware traffic diversion routing around a blocked event junction.
    Returns Primary (green), Secondary (orange), and Emergency (red) bypass routes depending on impact.
    """
    impact = req.predicted_impact_level.lower()
    severity = req.event_severity.lower()
    deployment_score = req.deployment_score
    
    # Low impact -> no diversions required
    if impact == "low":
        return DiversionResponse(
            routes=[],
            estimated_vehicles_diverted=0,
            estimated_delay_reduction="0%",
            diversion_required=False
        )

    # 1. Fetch Coordinates for Origin, Destination, and Event location
    start_id, end_id = _get_start_end_junctions(req.event_location)
    
    # Look up junction multiplier
    multiplier = 1.0
    junc_key = req.event_location.lower().strip()
    if junc_key in JUNCTION_CLASSIFICATIONS:
        multiplier = JUNCTION_CLASSIFICATIONS[junc_key]["multiplier"]
    
    with get_cursor() as cur:
        # Fetch start junction
        cur.execute("SELECT lat, lng FROM junctions WHERE id = ?", (start_id,))
        start_row = cur.fetchone()
        
        # Fetch end junction
        cur.execute("SELECT lat, lng FROM junctions WHERE id = ?", (end_id,))
        end_row = cur.fetchone()
        
        # Fetch event junction
        cur.execute("SELECT lat, lng FROM junctions WHERE id = ?", (req.event_location,))
        event_row = cur.fetchone()

    # Defaults in case DB check fails
    s_lat, s_lng = start_row if start_row else (12.9176, 77.6246)
    e_lat, e_lng = end_row if end_row else (12.9716, 77.5946)
    ev_lat, ev_lng = event_row if event_row else (12.9226, 77.6174)

    start_coords = (s_lat, s_lng)
    end_coords = (e_lat, e_lng)
    event_coords = (ev_lat, ev_lng)

    # Calculate detour waypoint offset from event coordinates (e.g. +0.012 lat/lng detour)
    detour_coords = (ev_lat + 0.012, ev_lng + 0.012)

    routes_list: List[RouteMetric] = []

    # 2. Determine number of routes to generate based on impact:
    # Medium -> 1 (Primary)
    # High -> 2 (Primary, Secondary)
    # Critical -> 3 (Primary, Secondary, Emergency)
    
    # A. Primary Route (standard direct route passing through/near event)
    p_path, p_dist, p_dur, _ = _query_osrm_route([start_coords, event_coords, end_coords])
    
    # Scale travel time based on impact level (congestion delays)
    time_multiplier = 1.8 if impact == "critical" else 1.5 if impact == "high" else 1.2
    # High deployment score mitigates the travel time delay
    deployment_time_mitigation = (deployment_score / 400.0)
    adjusted_multiplier = max(1.1, time_multiplier - deployment_time_mitigation)
    p_travel_time = max(1, int(round(p_dur * adjusted_multiplier * multiplier)))
    
    # Congestion score influenced by impact level, severity, mitigated by deployment score
    base_p_congestion = 85 if impact == "critical" else 65 if impact == "high" else 45
    severity_mod = 15 if severity == "critical" else 10 if severity == "high" else 0
    deployment_mitigation = int(deployment_score * 0.25)
    p_congestion = max(5, min(100, base_p_congestion + severity_mod - deployment_mitigation))
    
    p_route_score = max(5, 100 - p_congestion - int(p_dist * 1.5))
    
    routes_list.append(RouteMetric(
        id="primary",
        name="Primary Route (Direct)",
        path=p_path,
        distance=f"{p_dist:.1f} km",
        travel_time=f"{p_travel_time} min",
        congestion_score=p_congestion,
        route_score=p_route_score,
        recommended=False
    ))

    # B. Secondary Route (bypass route detouring around event)
    if impact in ("high", "critical"):
        s_path, s_dist, s_dur, _ = _query_osrm_route([start_coords, detour_coords, end_coords])
        
        # Bypasses event, standard timing applies with slight deployment speed-up
        s_adjusted_mult = max(1.0, 1.1 - (deployment_score / 1000.0))
        s_travel_time = max(1, int(round(s_dur * s_adjusted_mult)))
        
        base_s_congestion = 25
        s_severity_mod = 10 if severity in ("high", "critical") else 0
        s_deployment_mitigation = int(deployment_score * 0.15)
        s_congestion = max(5, min(100, base_s_congestion + s_severity_mod - s_deployment_mitigation))
        
        s_route_score = max(5, 100 - s_congestion - int(s_dist * 1.5))
        
        routes_list.append(RouteMetric(
            id="secondary",
            name="Secondary Route (Detour)",
            path=s_path,
            distance=f"{s_dist:.1f} km",
            travel_time=f"{s_travel_time} min",
            congestion_score=s_congestion,
            route_score=s_route_score,
            recommended=False
        ))
    # C. Tertiary Route (alternative bypass route detouring around event)
    if impact in ("high", "critical"):
        t_detour_coords = (ev_lat - 0.010, ev_lng - 0.010)
        t_path, t_dist, t_dur, _ = _query_osrm_route([start_coords, t_detour_coords, end_coords])
        
        # Bypasses event, standard timing applies
        t_adjusted_mult = max(1.1, 1.15 - (deployment_score / 1000.0))
        t_travel_time = max(1, int(round(t_dur * t_adjusted_mult)))
        
        base_t_congestion = 28
        t_severity_mod = 10 if severity in ("high", "critical") else 0
        t_deployment_mitigation = int(deployment_score * 0.12)
        t_congestion = max(5, min(100, base_t_congestion + t_severity_mod - t_deployment_mitigation))
        
        t_route_score = max(5, 100 - t_congestion - int(t_dist * 1.5))
        
        routes_list.append(RouteMetric(
            id="tertiary",
            name="Tertiary Route (Alt Detour)",
            path=t_path,
            distance=f"{t_dist:.1f} km",
            travel_time=f"{t_travel_time} min",
            congestion_score=t_congestion,
            route_score=t_route_score,
            recommended=False
        ))

    # D. Emergency Route (fastest direct cleared lane route)
    if impact == "critical":
        em_path, em_dist, em_dur, _ = _query_osrm_route([start_coords, event_coords, end_coords])
        
        # Cleared lane -> divided duration representing fast speed
        em_adjusted_div = 1.5 + (deployment_score / 200.0)
        em_travel_time = max(1, int(round((em_dur / em_adjusted_div) * multiplier)))
        
        base_em_congestion = 10
        em_severity_mod = 5 if severity == "critical" else 0
        em_deployment_mitigation = int(deployment_score * 0.1)
        em_congestion = max(5, min(100, base_em_congestion + em_severity_mod - em_deployment_mitigation))
        
        # Emergency route has restricted access, deduct 15 points to prioritize detours for general recommendation
        em_route_score = max(5, 100 - em_congestion - int(em_dist * 1.5) - 15)
        
        routes_list.append(RouteMetric(
            id="emergency",
            name="Emergency Route (Cleared)",
            path=em_path,
            distance=f"{em_dist:.1f} km",
            travel_time=f"{em_travel_time} min",
            congestion_score=em_congestion,
            route_score=em_route_score,
            recommended=False
        ))

    # Calculate traffic splits if multiple detours exist
    # General traffic detours are secondary and tertiary
    detours = [r for r in routes_list if r.id in ("secondary", "tertiary")]
    if len(detours) >= 2:
        total_score = sum(r.route_score for r in detours)
        if total_score > 0:
            for r in detours:
                r.traffic_split_pct = int(round((r.route_score / total_score) * 100))
            # Adjust to sum exactly to 100% due to rounding
            total_split = sum(r.traffic_split_pct for r in detours)
            if total_split != 100 and len(detours) > 0:
                detours[0].traffic_split_pct += (100 - total_split)
    elif len(detours) == 1:
        # Keep single-best-route response as fallback if only one viable detour exists
        detours[0].traffic_split_pct = 100

    # 3. Identify and set the single Recommended Route (highest route score, excluding emergency route for general traffic)
    if routes_list:
        recommendable_routes = [r for r in routes_list if r.id != "emergency"]
        if not recommendable_routes:
            recommendable_routes = routes_list
        best_route = max(recommendable_routes, key=lambda r: r.route_score)
        for r in routes_list:
            if r.id == best_route.id:
                r.recommended = True

    # 4. Operational Benefits Estimation
    base_pct = 0.25 if impact == "medium" else 0.45 if impact == "high" else 0.65
    severity_mult = 1.3 if severity == "critical" else 1.15 if severity == "high" else 1.0
    deployment_mult = 0.6 + (deployment_score / 250.0)
    vehicles_diverted = int(req.event_attendance * base_pct * severity_mult * deployment_mult * multiplier)
    vehicles_diverted = min(req.event_attendance, max(0, vehicles_diverted))

    base_delay_val = 15 if impact == "medium" else 28 if impact == "high" else 42
    deployment_delay_mod = int((deployment_score - 50) * 0.25)
    severity_delay_mod = 5 if severity == "critical" else 0
    delay_reduction_val = max(5, min(85, base_delay_val + deployment_delay_mod + severity_delay_mod))
    delay_reduction = f"{delay_reduction_val}%"

    return DiversionResponse(
        routes=routes_list,
        estimated_vehicles_diverted=vehicles_diverted,
        estimated_delay_reduction=delay_reduction,
        diversion_required=True
    )

