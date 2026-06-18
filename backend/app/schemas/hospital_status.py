from __future__ import annotations

from pydantic import BaseModel

class AccessJunctionDetail(BaseModel):
    junction_id: str
    junction_name: str
    effective_health_score: int
    contribution_to_penalty: int

class HospitalStatusResponse(BaseModel):
    hospital_id: str
    hospital_name: str
    lat: float
    lng: float
    accessibility_score: int
    accessibility_band: str

class HospitalDetailResponse(BaseModel):
    hospital_id: str
    hospital_name: str
    lat: float
    lng: float
    accessibility_score: int
    accessibility_band: str
    access_junctions: list[AccessJunctionDetail]
