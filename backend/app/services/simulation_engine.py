"""Simulation engine service.

Manages active simulations entirely in-memory. Simulations do NOT modify the
SQLite incidents table to preserve real data integrity.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from ..schemas.simulation import SimulationRequest, SimulationResponse

# In-memory store for active simulations
_ACTIVE_SIMULATIONS: dict[str, dict] = {}

# Mock data: Severity boost lookup table (health score penalty points)
EVENT_SEVERITY_BOOST: dict[str, dict[str, int]] = {
    "festival":        {"low": 10, "medium": 20, "high": 35},
    "political_rally": {"low": 15, "medium": 25, "high": 40},
    "accident":        {"low": 15, "medium": 30, "high": 50},
    "breakdown":       {"low":  5, "medium": 15, "high": 25},
    "construction":    {"low": 10, "medium": 20, "high": 30},
    "water_logging":   {"low": 20, "medium": 35, "high": 60},
}


def _get_affected_junctions(target_type: str, target_id: str) -> list[str]:
    """Resolve a target to a list of junction IDs."""
    if target_type == "junction":
        return [target_id]
    elif target_type == "zone":
        from .zones import JUNCTION_ZONES
        # Find all junctions in this zone
        return [j_id for j_id, z in JUNCTION_ZONES.items() if z == target_id]
    return []


def start_simulation(req: SimulationRequest) -> SimulationResponse:
    """Create a new simulation and store it in memory.
    
    For simplicity and deterministic behavior in demos, this system enforces
    only ONE active simulation at a time (starting a new one replaces the old).
    """
    global _ACTIVE_SIMULATIONS
    _ACTIVE_SIMULATIONS.clear()  # Ensure only 1 active simulation
    
    sim_id = f"sim_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    duration = 10
    expires_at = now + timedelta(minutes=duration)
    
    affected_ids = _get_affected_junctions(req.target_type, req.target_id)
    penalty = EVENT_SEVERITY_BOOST.get(req.event_type, {}).get(req.intensity, 20)
    
    sim_data = {
        "simulation_id": sim_id,
        "event_type": req.event_type,
        "target_type": req.target_type,
        "target_id": req.target_id,
        "intensity": req.intensity,
        "started_at": now.isoformat(),
        "duration_minutes": duration,
        "expires_at": expires_at.isoformat(),
        "affected_junction_ids": affected_ids,
        "_penalty": penalty,  # internal tracking
    }
    
    _ACTIVE_SIMULATIONS[sim_id] = sim_data
    return SimulationResponse(**sim_data)


def get_active_simulations() -> list[SimulationResponse]:
    """Return all currently active (non-expired) simulations."""
    now_iso = datetime.now(timezone.utc).isoformat()
    active_list = []
    
    # Iterate over a copy of keys so we can pop expired ones
    for sim_id in list(_ACTIVE_SIMULATIONS.keys()):
        sim = _ACTIVE_SIMULATIONS[sim_id]
        if sim["expires_at"] < now_iso:
            # Auto-expire
            _ACTIVE_SIMULATIONS.pop(sim_id, None)
        else:
            active_list.append(SimulationResponse(**sim))
            
    return active_list


def stop_simulation(sim_id: str) -> bool:
    """Stop an active simulation by ID."""
    if sim_id in _ACTIVE_SIMULATIONS:
        del _ACTIVE_SIMULATIONS[sim_id]
        return True
    return False


def get_simulation_overrides() -> dict[str, int]:
    """Calculate the current total penalty for all junctions.
    
    Returns a dict mapping junction_id -> cumulative_penalty_to_subtract.
    Auto-expires stale simulations first.
    """
    # Clean up expired
    get_active_simulations()
    
    overrides: dict[str, int] = {}
    for sim in _ACTIVE_SIMULATIONS.values():
        penalty = sim["_penalty"]
        for j_id in sim["affected_junction_ids"]:
            overrides[j_id] = overrides.get(j_id, 0) + penalty
            
    return overrides
