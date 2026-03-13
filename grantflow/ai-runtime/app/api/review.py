from fastapi import APIRouter

from app.schemas.ai_models import ReviewRequest
from app.services.orchestrator_service import orchestrator_service

router = APIRouter(prefix="/review", tags=["review"])


@router.post("/package")
def generate_review_package(request: ReviewRequest) -> dict:
    return orchestrator_service.run_review_package(request)
