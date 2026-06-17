"""CSV ingestion service.

Reads the Astram event CSV, validates columns, coerces types, maps columns
to the incident schema, and writes/upserts into SQLite.
"""

from __future__ import annotations

import math
from typing import Sequence

import pandas as pd

from ..db import get_cursor
from .synthetic_data import JUNCTIONS

# Columns we require from the source CSV
_REQUIRED_CSV_COLUMNS = {"id", "latitude", "longitude", "start_datetime"}

# Mapping from Astram event_cause / event_type to our incident_type vocabulary
_EVENT_CAUSE_MAP: dict[str, str] = {
    "vehicle_breakdown": "breakdown",
    "accident": "accident",
    "construction": "construction",
    "waterlogging": "waterlogging",
    "congestion": "congestion",
    "tree_fall": "accident",
    "others": "congestion",
    "fire": "accident",
    "protest": "congestion",
    "vip_movement": "congestion",
    "road_damage": "construction",
    "cable_repair": "construction",
    "gas_leakage": "accident",
    "water_pipeline": "construction",
    "pothole": "construction",
}

_EVENT_TYPE_MAP: dict[str, str] = {
    "unplanned": "accident",
    "planned": "construction",
}

# Priority → severity mapping
_PRIORITY_MAP: dict[str, str] = {
    "high": "high",
    "medium": "moderate",
    "moderate": "moderate",
    "low": "low",
    "critical": "critical",
}


def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Approximate distance in km between two lat/lng points."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _find_nearest_junction(lat: float, lng: float, junctions: Sequence[dict]) -> str:
    """Return the junction id closest to the given lat/lng."""
    best_id = junctions[0]["id"]
    best_dist = float("inf")
    for j in junctions:
        dist = _haversine_distance(lat, lng, j["lat"], j["lng"])
        if dist < best_dist:
            best_dist = dist
            best_id = j["id"]
    return best_id


def _map_incident_type(row: pd.Series) -> str:
    """Derive incident_type from CSV event_cause and event_type columns."""
    cause = str(row.get("event_cause", "")).strip().lower()
    if cause in _EVENT_CAUSE_MAP:
        return _EVENT_CAUSE_MAP[cause]

    etype = str(row.get("event_type", "")).strip().lower()
    return _EVENT_TYPE_MAP.get(etype, "congestion")


def _map_severity(row: pd.Series) -> str:
    """Derive severity from CSV priority column."""
    priority = str(row.get("priority", "")).strip().lower()
    return _PRIORITY_MAP.get(priority, "moderate")


def load_incidents_from_csv(path: str) -> pd.DataFrame:
    """Read the Astram CSV, validate required columns, coerce types, and
    return a DataFrame with columns matching the incidents table schema.
    """
    df = pd.read_csv(path, dtype=str)

    # Normalize column names (lowercase, strip whitespace)
    df.columns = df.columns.str.strip().str.lower()

    # Validate required columns exist
    missing = _REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    # Coerce types
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    # Drop rows with invalid lat/lng
    df = df.dropna(subset=["latitude", "longitude"])
    df = df[(df["latitude"] != 0) & (df["longitude"] != 0)]

    # Parse timestamps
    df["start_datetime"] = pd.to_datetime(df["start_datetime"], errors="coerce", utc=True)
    df = df.dropna(subset=["start_datetime"])

    # Map to our schema columns
    result = pd.DataFrame()
    result["id"] = df["id"]
    result["junction_id"] = df.apply(
        lambda row: _find_nearest_junction(row["latitude"], row["longitude"], JUNCTIONS),
        axis=1,
    )
    result["incident_type"] = df.apply(_map_incident_type, axis=1)
    result["severity"] = df.apply(_map_severity, axis=1)
    result["timestamp"] = df["start_datetime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    result["weather"] = "clear"
    result["temperature_c"] = 25.0
    result["description"] = df.get("description", "").fillna("").astype(str)

    return result.reset_index(drop=True)


def seed_junctions() -> None:
    """Insert the 8 Bengaluru junctions into the junctions table."""
    with get_cursor() as cur:
        cur.executemany(
            "INSERT OR REPLACE INTO junctions (id, name, lat, lng, road_type) VALUES (?, ?, ?, ?, ?)",
            [(j["id"], j["name"], j["lat"], j["lng"], j["road_type"]) for j in JUNCTIONS],
        )


def write_to_sqlite(df: pd.DataFrame) -> int:
    """Upsert incident rows from a DataFrame into the incidents table.

    Returns the number of rows written.
    """
    rows = df.to_dict("records")
    with get_cursor() as cur:
        cur.executemany(
            """INSERT OR REPLACE INTO incidents
               (id, junction_id, incident_type, severity, timestamp, weather, temperature_c, description)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                (
                    r["id"], r["junction_id"], r["incident_type"], r["severity"],
                    r["timestamp"], r["weather"], r["temperature_c"], r["description"],
                )
                for r in rows
            ],
        )
    return len(rows)
