from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DATABASE_PATH, DATA_DIR


def get_db_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(DATABASE_PATH), timeout=30.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


@contextmanager
def get_cursor() -> Iterator[sqlite3.Cursor]:
    """Yield a cursor that auto-commits on success and rolls back on error."""
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        yield cursor
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def create_tables() -> None:
    """Create the junctions and incidents tables if they don't exist."""
    connection = get_db_connection()
    try:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS junctions (
                id        TEXT PRIMARY KEY,
                name      TEXT NOT NULL,
                lat       REAL NOT NULL,
                lng       REAL NOT NULL,
                road_type TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS incidents (
                id            TEXT PRIMARY KEY,
                junction_id   TEXT NOT NULL REFERENCES junctions(id),
                incident_type TEXT NOT NULL,
                severity      TEXT NOT NULL,
                timestamp     TEXT NOT NULL,
                closed_datetime   TEXT,
                resolved_datetime TEXT,
                weather       TEXT NOT NULL DEFAULT 'clear',
                temperature_c REAL NOT NULL DEFAULT 25.0,
                description   TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS alerts (
                alert_id    TEXT PRIMARY KEY,
                severity    TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT NOT NULL,
                confidence  REAL NOT NULL,
                created_at  TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'active'
            );

            CREATE INDEX IF NOT EXISTS idx_incidents_junction_id
                ON incidents(junction_id);
            CREATE INDEX IF NOT EXISTS idx_incidents_timestamp
                ON incidents(timestamp DESC);
        """)
        connection.commit()
    finally:
        connection.close()

    ensure_incident_resolution_columns()


def ensure_incident_resolution_columns() -> None:
    """Add incident close/resolution columns to older databases in place."""
    required_columns = {
        "closed_datetime": "TEXT",
        "resolved_datetime": "TEXT",
    }

    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("PRAGMA table_info(incidents)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                cursor.execute(
                    f"ALTER TABLE incidents ADD COLUMN {column_name} {column_type}"
                )
        connection.commit()
    finally:
        connection.close()
