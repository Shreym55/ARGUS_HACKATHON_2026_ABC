from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings


def _connect() -> sqlite3.Connection:
    settings = get_settings()
    db_path = Path(settings.app_db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_application_store() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS applications (
                application_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                grant_type TEXT NOT NULL,
                application_json TEXT NOT NULL,
                screening_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_application_record(
    *,
    application_id: str,
    session_id: str,
    grant_type: str,
    application_payload: dict,
    screening_result: dict,
) -> None:
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO applications (
                application_id, session_id, grant_type, application_json, screening_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                application_id,
                session_id,
                grant_type,
                json.dumps(application_payload, ensure_ascii=True),
                json.dumps(screening_result, ensure_ascii=True),
                created_at,
            ),
        )
        conn.commit()
