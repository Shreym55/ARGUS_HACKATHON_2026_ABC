from __future__ import annotations

import json
import logging
import logging.handlers
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Request-scoped correlation ID (propagates through async & sync call stacks) ──
_rid_var: ContextVar[str] = ContextVar("rid", default="-")


def set_request_id(rid: str) -> None:
    _rid_var.set(rid)


def get_request_id() -> str:
    return _rid_var.get()


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


# ── JSON formatter ────────────────────────────────────────────────────────────

_SKIP_FIELDS = frozenset(
    {
        "args", "created", "exc_info", "exc_text", "filename", "funcName",
        "levelname", "levelno", "lineno", "message", "module", "msecs", "msg",
        "name", "pathname", "process", "processName", "relativeCreated",
        "stack_info", "thread", "threadName", "taskName",
    }
)


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level": record.levelname,
            "logger": record.name,
            "rid": _rid_var.get(),
            "msg": record.getMessage(),
        }
        # Merge any extra= kwargs passed to log calls
        for key, val in record.__dict__.items():
            if key not in _SKIP_FIELDS and not key.startswith("_"):
                entry[key] = val
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


# ── Setup ─────────────────────────────────────────────────────────────────────

def setup_logging(level: str, log_file: str = "logs/ai-runtime.log") -> None:
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    json_fmt = _JsonFormatter()
    plain_fmt = logging.Formatter(
        "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    # Console — human-readable
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(plain_fmt)

    # File — structured JSON, rotating (10 MB × 5 backups = 50 MB max)
    file_handler = logging.handlers.RotatingFileHandler(
        log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(json_fmt)

    root = logging.getLogger()
    root.setLevel(level.upper())
    # Avoid duplicate handlers if called again (e.g. during tests)
    if not root.handlers:
        root.addHandler(console_handler)
        root.addHandler(file_handler)
    else:
        root.handlers.clear()
        root.addHandler(console_handler)
        root.addHandler(file_handler)

    # Silence noisy third-party libraries
    for lib in ("httpx", "httpcore", "openai", "uvicorn.access", "langgraph"):
        logging.getLogger(lib).setLevel(logging.WARNING)
