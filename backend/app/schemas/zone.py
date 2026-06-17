from __future__ import annotations

from pydantic import BaseModel


class ZoneStatusResponse(BaseModel):
    zone_name: str
    risk_category: str
    junction_count: int
