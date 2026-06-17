from __future__ import annotations

from fastapi import APIRouter

from ..schemas.simulation import SimulationRequest, SimulationResponse
from ..services.simulation_engine import start_simulation, get_active_simulations, stop_simulation

router = APIRouter()

@router.post("/simulation/start", response_model=SimulationResponse)
def start_sim(request: SimulationRequest) -> SimulationResponse:
    """Start a new simulation."""
    return start_simulation(request)

@router.get("/simulation/active", response_model=list[SimulationResponse])
def get_active() -> list[SimulationResponse]:
    """Get all active simulations."""
    return get_active_simulations()

@router.delete("/simulation/{sim_id}")
def stop_sim(sim_id: str) -> dict:
    """Stop an active simulation."""
    stopped = stop_simulation(sim_id)
    return {"simulation_id": sim_id, "status": "stopped" if stopped else "not_found"}
