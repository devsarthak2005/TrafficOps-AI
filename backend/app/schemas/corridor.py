from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel


class HospitalResponse(BaseModel):
    id: str
    name: str
    lat: float
    lng: float


class CorridorRequest(BaseModel):
    hospital_id: str
    incident_junction_id: str


class RouteVariant(BaseModel):
    geometry: dict[str, Any]  # GeoJSON LineString geometry
    duration_minutes: int
    label: str
    note: Optional[str] = None
    resource_note: Optional[str] = None


class CorridorRoutes(BaseModel):
    fastest: RouteVariant
    safest: RouteVariant
    protected: RouteVariant


class CorridorResponse(BaseModel):
    hospital_id: str
    hospital_name: str
    incident_junction_id: str
    incident_junction_name: str
    is_approximate: bool
    routes: CorridorRoutes
