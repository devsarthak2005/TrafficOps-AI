from __future__ import annotations

from fastapi import APIRouter

from ..config import BACKEND_NAME
from ..schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service=BACKEND_NAME)
