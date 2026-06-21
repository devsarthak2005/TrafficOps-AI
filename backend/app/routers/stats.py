"""Stats router — serves computed dashboard KPIs from real data."""

from __future__ import annotations

from fastapi import APIRouter

from ..services.dashboard_stats import compute_city_intelligence, compute_dashboard_stats

router = APIRouter()


@router.get("/api/stats/overview")
def get_stats_overview() -> dict:
    """Return all computed dashboard statistics.

    Every value is derived from the SQLite database, ML feedback dataset,
    health score engine, resource engine, and zone aggregation service.
    No hardcoded values.
    """
    return compute_dashboard_stats()


@router.get("/api/stats/city-intelligence")
def get_city_intelligence() -> dict:
    """Return the city intelligence slice of the computed dashboard stats."""
    return compute_city_intelligence()
