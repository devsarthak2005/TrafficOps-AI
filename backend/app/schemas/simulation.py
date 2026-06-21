from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

class SimulationRequest(BaseModel):
    event_type: Literal["festival", "political_rally", "sports_event", "accident", "breakdown", "construction", "water_logging"]
    target_type: Literal["junction", "zone"]
    target_id: str
    intensity: Literal["low", "medium", "high"]

class SimulationResponse(BaseModel):
    simulation_id: str
    event_type: str
    target_type: str
    target_id: str
    intensity: str
    started_at: str
    duration_minutes: int
    expires_at: str
    affected_junction_ids: list[str]
