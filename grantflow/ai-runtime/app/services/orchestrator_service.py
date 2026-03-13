from __future__ import annotations

from app.graphs.orchestrator_graph import get_orchestrator_graph
from app.schemas.ai_models import ComplianceRequest, ReviewRequest, ScreeningRequest, TaskType


class OrchestratorService:
    def __init__(self) -> None:
        self._graph = get_orchestrator_graph()

    def run_screening(self, request: ScreeningRequest) -> dict:
        state = {
            "run_id": request.run_id,
            "task_type": TaskType.screening.value,
            "payload": request.model_dump(mode="json"),
        }
        result = self._graph.invoke(state)
        return result["formatted_result"]

    def run_review_package(self, request: ReviewRequest) -> dict:
        state = {
            "run_id": request.run_id,
            "task_type": TaskType.review_package.value,
            "payload": request.model_dump(mode="json"),
        }
        result = self._graph.invoke(state)
        return result["formatted_result"]

    def run_compliance(self, request: ComplianceRequest) -> dict:
        state = {
            "run_id": request.run_id,
            "task_type": TaskType.compliance.value,
            "payload": request.model_dump(mode="json"),
        }
        result = self._graph.invoke(state)
        return result["formatted_result"]


orchestrator_service = OrchestratorService()
