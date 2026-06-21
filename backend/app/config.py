from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_NAME = "trafficops-backend"
DEFAULT_ALLOWED_ORIGINS = ("http://localhost:3000", "https://traffic-ops-ai-seven.vercel.app")
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "trafficops.db"
RAW_DATA_DIR = DATA_DIR / "raw"
CSV_PATH = RAW_DATA_DIR / "incidents.csv"

# Load environment variables
load_dotenv(dotenv_path=BASE_DIR / ".env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ENABLE_GEMINI = os.getenv("ENABLE_GEMINI", "true").strip().lower() in {"1", "true", "yes", "on"}
AI_CACHE_TTL_SECONDS = int(os.getenv("AI_CACHE_TTL_SECONDS", "300"))
AI_FAILURE_COOLDOWN_SECONDS = int(os.getenv("AI_FAILURE_COOLDOWN_SECONDS", "30"))
AI_QUOTA_COOLDOWN_SECONDS = int(os.getenv("AI_QUOTA_COOLDOWN_SECONDS", "120"))
AI_MAX_COOLDOWN_SECONDS = int(os.getenv("AI_MAX_COOLDOWN_SECONDS", "1800"))
AI_REQUEST_TIMEOUT_SECONDS = float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "10"))
AI_DEDUPE_WAIT_SECONDS = float(os.getenv("AI_DEDUPE_WAIT_SECONDS", "11"))
AI_MAX_CACHE_ENTRIES = int(os.getenv("AI_MAX_CACHE_ENTRIES", "256"))
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "http://localhost:5000")
OSRM_PUBLIC_FALLBACK_URL = "https://routing.openstreetmap.de/routed-car"


JUNCTION_CLASSIFICATIONS = {
    "silk-board": {"class": "highway", "multiplier": 1.3},
    "hebbal-flyover": {"class": "highway", "multiplier": 1.3},
    "kr-puram": {"class": "highway", "multiplier": 1.3},
    "tin-factory": {"class": "highway", "multiplier": 1.3},
    "marathahalli-bridge": {"class": "arterial", "multiplier": 1.0},
    "old-madras-road": {"class": "arterial", "multiplier": 1.0},
    "mg-road": {"class": "arterial", "multiplier": 1.0},
    "bellandur": {"class": "collector", "multiplier": 0.8},
    "jp-nagar": {"class": "collector", "multiplier": 0.8},
}
