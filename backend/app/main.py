from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import BACKEND_NAME, CSV_PATH, DEFAULT_ALLOWED_ORIGINS
from .db import create_tables, get_cursor
from .routers.health import router as health_router
from .routers.junctions import router as junctions_router
from .routers.incidents import router as incidents_router
from .routers.zones import router as zones_router
from .routers.heatmap import router as heatmap_router
from .routers.simulation import router as simulation_router
from .routers.resources import router as resources_router
from .routers.alerts import router as alerts_router
from .routers.corridors import router as corridors_router
from .routers.hospitals import router as hospitals_router
from .routers.similar_incidents import router as similar_incidents_router
from .routers.ml import router as ml_router

logger = logging.getLogger(__name__)

def _is_db_empty() -> bool:
    """Check if the junctions table has any rows."""
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM junctions")
        count = cur.fetchone()[0]
    return count == 0

def _seed_on_startup() -> None:
    """Seed the database if it's empty. Prefers CSV, falls back to synthetic."""
    from .services.ingestion import load_incidents_from_csv, seed_junctions, write_to_sqlite

    seed_junctions()
    logger.info("Seeded %d junctions.", 8)

    if CSV_PATH.exists():
        logger.info("Found CSV at %s — loading real data.", CSV_PATH)
        df = load_incidents_from_csv(str(CSV_PATH))
        count = write_to_sqlite(df)
        logger.info("Loaded %d incidents from CSV.", count)
    else:
        logger.info("No CSV found at %s — generating synthetic data.", CSV_PATH)
        from .services.synthetic_data import generate_synthetic_incidents

        df = generate_synthetic_incidents(500)
        count = write_to_sqlite(df)
        logger.info("Generated %d synthetic incidents.", count)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    create_tables()
    if _is_db_empty():
        _seed_on_startup()
    else:
        logger.info("Database already populated — skipping seed.")
    yield

app = FastAPI(title=BACKEND_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(DEFAULT_ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"]
)

app.include_router(health_router)
app.include_router(junctions_router)
app.include_router(incidents_router)
app.include_router(zones_router)
app.include_router(heatmap_router)
app.include_router(simulation_router)
app.include_router(resources_router)
app.include_router(alerts_router)
app.include_router(corridors_router)
app.include_router(hospitals_router)
app.include_router(similar_incidents_router)
app.include_router(ml_router)

