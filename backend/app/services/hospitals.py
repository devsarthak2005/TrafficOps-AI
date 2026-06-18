from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict

from ..config import DATA_DIR


class Hospital(TypedDict):
    id: str
    name: str
    lat: float
    lng: float


# Cache the loaded hospitals in memory
_HOSPITALS: list[Hospital] = []


def _load_hospitals() -> list[Hospital]:
    """Load hospitals from hospitals.json if not already loaded."""
    global _HOSPITALS
    if not _HOSPITALS:
        path = DATA_DIR / "hospitals.json"
        try:
            with open(path, "r", encoding="utf-8") as f:
                _HOSPITALS = json.load(f)
        except Exception as e:
            # Fallback in case of read error (though file exists)
            print(f"Error loading hospitals.json: {e}")
            _HOSPITALS = []
    return _HOSPITALS


def get_all_hospitals() -> list[Hospital]:
    """Return list of all hospitals."""
    return _load_hospitals()


def get_hospital_by_id(hospital_id: str) -> Hospital | None:
    """Return a hospital by its ID or None if not found."""
    hospitals = _load_hospitals()
    for h in hospitals:
        if h["id"] == hospital_id:
            return h
    return None
