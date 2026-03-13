from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request

from app.api.compliance import router as compliance_router
from app.api.health import router as health_router
from app.api.intake import router as intake_router
from app.api.review import router as review_router
from app.api.screening import router as screening_router
from app.core.config import get_settings
from app.core.logging import get_logger, set_request_id, setup_logging
from app.llm.client import llm_client
from app.services.application_store import init_application_store

settings = get_settings()
setup_logging(settings.log_level, settings.log_file)

logger = get_logger("app.main")

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="GrantFlow AI Runtime with a single LangGraph orchestrator.",
)

app.include_router(health_router)
app.include_router(screening_router, prefix="/api/v1")
app.include_router(review_router, prefix="/api/v1")
app.include_router(compliance_router, prefix="/api/v1")
app.include_router(intake_router, prefix="/api/v1")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    set_request_id(rid)
    start = time.perf_counter()

    logger.info(
        "http_request",
        extra={
            "event": "http_request",
            "method": request.method,
            "path": request.url.path,
            "client": request.client.host if request.client else "unknown",
        },
    )

    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        "http_response",
        extra={
            "event": "http_response",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "elapsed_ms": elapsed_ms,
        },
    )
    return response


@app.on_event("startup")
def startup() -> None:
    logger.info(
        "startup",
        extra={
            "event": "startup",
            "model": settings.openai_model,
            "llm_enabled": llm_client.enabled,
            "llm_disable_reason": llm_client.disable_reason,
        },
    )
    init_application_store()
