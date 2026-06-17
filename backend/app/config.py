from __future__ import annotations

from pathlib import Path

BACKEND_NAME = "trafficops-backend"
DEFAULT_ALLOWED_ORIGINS = ("http://localhost:3000",)
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "trafficops.db"
RAW_DATA_DIR = DATA_DIR / "raw"
CSV_PATH = RAW_DATA_DIR / "incidents.csv"
