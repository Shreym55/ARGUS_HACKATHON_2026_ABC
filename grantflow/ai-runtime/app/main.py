from fastapi import FastAPI

from app.api.compliance import router as compliance_router
from app.api.health import router as health_router
from app.api.intake import router as intake_router
from app.api.review import router as review_router
from app.api.screening import router as screening_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.services.application_store import init_application_store

settings = get_settings()
setup_logging(settings.log_level)

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


@app.on_event("startup")
def startup() -> None:
    init_application_store()
