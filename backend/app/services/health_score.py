"""Junction Health Score engine.

Computes a 0–100 health score per junction based on incident frequency,
severity mix, and recency. This is the signature metric used throughout
the TrafficOps AI dashboard.

Formula (transparent, documented for the Copilot's "explain this" feature):
──────────────────────────────────────────────────────────────────────────
1. Start at 100.
2. For each incident at this junction, subtract a severity-weighted penalty:
       low = 2,  moderate = 5,  high = 10,  critical = 20
3. Apply a recency multiplier so recent incidents weigh more:
       Last 6 hours  → 1.0×  (full weight)
       6–24 hours    → 0.6×
       Older (>24h)  → 0.3×
4. Clamp the result to [0, 100].
5. Map to risk category:
       ≥ 85 → "healthy"
       70–84 → "moderate"
       50–69 → "watchlist"
       < 50  → "critical"
──────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..db import get_cursor
from .simulation_engine import get_simulation_overrides

# ── Severity penalty points ──────────────────────────────────────────────
SEVERITY_PENALTY: dict[str, float] = {
    "low": 2,
    "moderate": 5,
    "high": 10,
    "critical": 20,
}

# ── Recency multiplier thresholds (from most recent to oldest) ───────────
# Each tuple: (timedelta boundary, multiplier)
# An incident within 6 hours of "now" gets 1.0×; between 6–24h gets 0.6×;
# older than 24h gets 0.3×.
_RECENCY_BANDS: list[tuple[timedelta, float]] = [
    (timedelta(hours=6), 1.0),
    (timedelta(hours=24), 0.6),
]
_RECENCY_DEFAULT = 0.3  # anything older than 24h

# ── Risk category thresholds ─────────────────────────────────────────────
RISK_THRESHOLDS: list[tuple[int, str]] = [
    (85, "healthy"),
    (70, "moderate"),
    (50, "watchlist"),
    (0, "critical"),
]


def derive_risk_category(health_score: int) -> str:
    """Map a numeric health score to a risk category string.

    Exported so other modules (junction_aggregation) can reuse the same
    thresholds without duplicating them.
    """
    for threshold, category in RISK_THRESHOLDS:
        if health_score >= threshold:
            return category
    return "critical"


def _recency_multiplier(incident_ts: datetime, now: datetime) -> float:
    """Return the recency weight for an incident based on its timestamp."""
    age = now - incident_ts
    for boundary, multiplier in _RECENCY_BANDS:
        if age <= boundary:
            return multiplier
    return _RECENCY_DEFAULT


def compute_health_score(junction_id: str, include_simulated: bool = False) -> dict:
    """Compute the real-time health score for a single junction.

    Returns {"health_score": int, "risk_category": str}.
    If include_simulated is True, subtracts temporary penalties from active simulations.
    """
    now = datetime.now(timezone.utc)

    with get_cursor() as cur:
        cur.execute(
            "SELECT severity, timestamp FROM incidents WHERE junction_id = ?",
            (junction_id,),
        )
        rows = cur.fetchall()

    # Start at a perfect score of 100
    score = 100.0

    for row in rows:
        severity = row["severity"]
        raw_ts = row["timestamp"]

        # Parse the ISO timestamp
        try:
            ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            # If timestamp is unparseable, use default recency weight
            ts = now - timedelta(hours=48)

        # Subtract weighted penalty: base penalty × recency multiplier
        penalty = SEVERITY_PENALTY.get(severity, 5)
        multiplier = _recency_multiplier(ts, now)
        score -= penalty * multiplier

    # Apply simulation overrides if requested
    if include_simulated:
        overrides = get_simulation_overrides()
        if junction_id in overrides:
            score -= overrides[junction_id]

    # Clamp to [0, 100]
    health_score = max(0, min(100, round(score)))

    return {
        "health_score": health_score,
        "risk_category": derive_risk_category(health_score),
    }
