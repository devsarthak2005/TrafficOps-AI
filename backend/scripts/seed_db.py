#!/usr/bin/env python
"""Standalone seed script — drops and recreates all tables, then reloads data.

Usage (from the backend/ directory):
    python scripts/seed_db.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Allow imports from the backend package when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import CSV_PATH
from app.db import get_db_connection, create_tables
from app.services.ingestion import load_incidents_from_csv, seed_junctions, write_to_sqlite
from app.services.synthetic_data import generate_synthetic_incidents


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger("seed_db")

    # Drop existing tables
    logger.info("Dropping existing tables...")
    conn = get_db_connection()
    conn.executescript("""
        DROP TABLE IF EXISTS incidents;
        DROP TABLE IF EXISTS junctions;
    """)
    conn.close()

    # Recreate tables
    logger.info("Creating tables...")
    create_tables()

    # Seed junctions
    seed_junctions()
    logger.info("Seeded 8 junctions.")

    # Load incidents
    if CSV_PATH.exists():
        logger.info("Found CSV at %s — loading real data.", CSV_PATH)
        df = load_incidents_from_csv(str(CSV_PATH))
        count = write_to_sqlite(df)
        logger.info("Loaded %d incidents from CSV.", count)
    else:
        logger.info("No CSV found — generating 500 synthetic incidents.")
        df = generate_synthetic_incidents(500)
        count = write_to_sqlite(df)
        logger.info("Generated %d synthetic incidents.", count)

    logger.info("Done. Database is ready.")


if __name__ == "__main__":
    main()
