from fastapi import APIRouter

from app.schemas.ai_models import ScreeningRequest
from app.services.orchestrator_service import orchestrator_service

router = APIRouter(prefix="/screening", tags=["screening"])


@router.post("/analyze")
def analyze_screening(request: ScreeningRequest) -> dict:
    return orchestrator_service.run_screening(request)
