from __future__ import annotations

from app.data.chat_question_bank import QUESTION_BANK
from app.graphs.intake_graph import get_intake_graph
from app.graphs.intake_nodes.common import validate_value
from app.schemas.ai_models import IntakeChatRequest, IntakeChatResponse, IntakeTurnRequest, IntakeTurnResponse


class IntakeOrchestratorService:
    def __init__(self) -> None:
        self._graph = get_intake_graph()

    def run_chat_turn(self, request: IntakeChatRequest) -> IntakeChatResponse:
        state = {
            "session_id": request.session_id,
            "message": request.message,
            "grant_type": request.grant_type.value if request.grant_type else None,
            "collected_fields": request.collected_fields,
            "current_field_key": request.current_field_key,
        }
        result = self._graph.invoke(state)
        return IntakeChatResponse.model_validate(result["result"])


intake_orchestrator_service = IntakeOrchestratorService()


def handle_intake_chat(request: IntakeChatRequest) -> IntakeChatResponse:
    return intake_orchestrator_service.run_chat_turn(request)


def handle_intake_turn(request: IntakeTurnRequest) -> IntakeTurnResponse:
    # Backward compatible endpoint for existing clients.
    questions = QUESTION_BANK[request.grant_type]
    collected = dict(request.collected_fields)
    validation_error = None

    if request.last_field_key:
        question_def = next((q for q in questions if q["key"] == request.last_field_key), None)
        if question_def:
            validation_error = validate_value(question_def["type"], request.last_answer)
            if not validation_error:
                collected[request.last_field_key] = request.last_answer

    next_question = next((q for q in questions if q["key"] not in collected), None)
    if not next_question:
        return IntakeTurnResponse(
            grant_type=request.grant_type,
            collected_fields=collected,
            next_field_key=None,
            next_question=None,
            validation_error=validation_error,
            is_complete=True,
        )

    return IntakeTurnResponse(
        grant_type=request.grant_type,
        collected_fields=collected,
        next_field_key=next_question["key"],
        next_question=next_question["question"],
        validation_error=validation_error,
        is_complete=False,
    )
