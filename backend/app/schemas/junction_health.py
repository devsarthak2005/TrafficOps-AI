from __future__ import annotations

from pydantic import BaseModel


class JunctionHealthResponse(BaseModel):
    junction_id: str
    health_score: int
    risk_category: str
