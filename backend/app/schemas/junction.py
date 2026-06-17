from __future__ import annotations

from pydantic import BaseModel


class JunctionResponse(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    road_type: str
