from fastapi import APIRouter

from app.schemas.ai_models import ComplianceRequest
from app.services.orchestrator_service import orchestrator_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.post("/analyze")
def analyze_compliance(request: ComplianceRequest) -> dict:
    return orchestrator_service.run_compliance(request)
