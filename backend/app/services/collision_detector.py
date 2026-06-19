from __future__ import annotations

import math
import logging
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List

logger = logging.getLogger(__name__)

class Event(BaseModel):
    id: str
    event_cause: str
    latitude: float
    longitude: float
    start_datetime: datetime
    junction_id: str = "Unknown"

class CollisionFlag(BaseModel):
    event_ids: List[str]
    num_overlapping: int
    combined_impact_multiplier: float
    junctions_affected: List[str]
    event_causes: List[str] = []
    min_distance_km: float = 0.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def detect_collisions(
    active_events: List[Event], 
    time_window_hours: float = 2.0, 
    distance_km: float = 5.0
) -> List[CollisionFlag]:
    """
    Find clusters of active events overlapping spatially (distance <= distance_km) 
    and temporally (start time difference <= time_window_hours).
    
    If 2+ events are found together, they are flagged as a collision group.
    Combined multiplier starts at 1.0 base, +0.3 per additional overlapping event, capped at 2.5.
    """
    if not active_events:
        return []

    n = len(active_events)
    # Ensure all timestamps are coerced to UTC timezone-aware datetimes for safe comparison
    utc_times = []
    for e in active_events:
        t = e.start_datetime
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        else:
            t = t.astimezone(timezone.utc)
        utc_times.append(t)

    # 1. Build adjacency list of overlapping events
    adj = {e.id: [] for e in active_events}
    for i in range(n):
        e1 = active_events[i]
        t1 = utc_times[i]
        for j in range(i + 1, n):
            e2 = active_events[j]
            t2 = utc_times[j]

            # Spatial check
            dist = haversine_distance(e1.latitude, e1.longitude, e2.latitude, e2.longitude)
            # Temporal check
            time_diff = abs((t1 - t2).total_seconds()) / 3600.0

            if dist <= distance_km and time_diff <= time_window_hours:
                adj[e1.id].append(e2.id)
                adj[e2.id].append(e1.id)

    # 2. Extract connected components using BFS
    visited = set()
    collision_groups = []
    event_map = {e.id: e for e in active_events}

    for e in active_events:
        if e.id in visited:
            continue

        component = []
        queue = [e.id]
        visited.add(e.id)

        while queue:
            curr_id = queue.pop(0)
            component.append(curr_id)
            for neighbor_id in adj[curr_id]:
                if neighbor_id not in visited:
                    visited.add(neighbor_id)
                    queue.append(neighbor_id)

        # Collision clusters require at least 2 events
        if len(component) >= 2:
            multiplier = min(2.5, 1.0 + 0.3 * (len(component) - 1))
            juncs = sorted(list(set(
                event_map[eid].junction_id 
                for eid in component 
                if event_map[eid].junction_id != "Unknown"
            )))

            # Event types in this group
            causes = sorted(list(set(
                event_map[eid].event_cause.replace("_", " ").capitalize()
                for eid in component
            )))

            # Closest distance between overlapping events
            min_dist = 999.0
            for i in range(len(component)):
                eid1 = component[i]
                ev1 = event_map[eid1]
                for j in range(i + 1, len(component)):
                    eid2 = component[j]
                    ev2 = event_map[eid2]
                    d = haversine_distance(ev1.latitude, ev1.longitude, ev2.latitude, ev2.longitude)
                    if d < min_dist:
                        min_dist = d
            if min_dist == 999.0:
                min_dist = 0.0

            collision_groups.append(CollisionFlag(
                event_ids=sorted(component),
                num_overlapping=len(component),
                combined_impact_multiplier=round(multiplier, 2),
                junctions_affected=juncs,
                event_causes=causes,
                min_distance_km=round(min_dist, 1)
            ))

    return collision_groups

    return collision_groups

def get_active_events_from_db(hours: float = 24.0) -> List[Event]:
    """Retrieve incidents from SQLite within the last `hours` window of current time."""
    from datetime import datetime, timezone, timedelta
    from ..db import get_cursor
    
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    with get_cursor() as cur:
        cur.execute("""
            SELECT i.id, i.incident_type, i.timestamp, i.junction_id, j.lat, j.lng
            FROM incidents i
            JOIN junctions j ON i.junction_id = j.id
            WHERE i.timestamp >= ?
            ORDER BY i.timestamp DESC
        """, (since_str,))
        rows = cur.fetchall()

    events = []
    for r in rows:
        try:
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
        except Exception:
            ts = now
        
        events.append(Event(
            id=r["id"],
            event_cause=r["incident_type"],
            latitude=r["lat"],
            longitude=r["lng"],
            start_datetime=ts,
            junction_id=r["junction_id"]
        ))
    return events

