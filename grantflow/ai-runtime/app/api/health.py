from fastapi import APIRouter

from app.core.config import get_settings
from app.llm.client import llm_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "model": settings.openai_model,
        "llm_enabled": llm_client.enabled,
    }
