from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class AlertResponse(BaseModel):
    alert_id: str
    alert_type: str
    junction_id: Optional[str] = None
    junction_name: Optional[str] = None
    confidence: int
    message: str
    generated_at: str


class DismissResponse(BaseModel):
    alert_id: str
    status: str
    suppressed_until: str
