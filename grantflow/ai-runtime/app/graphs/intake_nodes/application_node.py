from __future__ import annotations

from typing import Any

from app.data.chat_question_bank import QUESTION_BANK
from app.schemas.ai_models import ChatIntent, GrantType, IntakeChatResponse
from app.services.application_submission_service import submit_application_from_chat

from .common import extract_answer, next_missing_question, validate_value


def application_node(state: dict) -> dict:
    grant_type_value = state.get("grant_type")
    if not grant_type_value:
        response = IntakeChatResponse(
            session_id=state["session_id"],
            intent=ChatIntent.application,
            reply="Please select a grant type first: cdg, eig, or ecag.",
            grant_type=None,
            collected_fields=state.get("collected_fields", {}),
            is_complete=False,
        )
        return {"result": response.model_dump(mode="json")}

    grant_type = GrantType(grant_type_value)
    questions = QUESTION_BANK[grant_type]
    collected: dict[str, Any] = dict(state.get("collected_fields", {}))
    current_field_key = state.get("current_field_key")
    validation_error = None

    if current_field_key:
        question_def = next((q for q in questions if q["key"] == current_field_key), None)
        if question_def:
            candidate = extract_answer(question_def["type"], state["message"])
            validation_error = validate_value(question_def["type"], candidate)
            if not validation_error:
                collected[current_field_key] = candidate

    next_question = next_missing_question(grant_type, collected)
    if next_question:
        response = IntakeChatResponse(
            session_id=state["session_id"],
            intent=ChatIntent.application,
            grant_type=grant_type,
            reply=(
                f"{validation_error} {next_question['question']}".strip()
                if validation_error
                else next_question["question"]
            ),
            collected_fields=collected,
            current_field_key=next_question["key"],
            next_question=next_question["question"],
            validation_error=validation_error,
            is_complete=False,
            is_submitted=False,
        )
        return {"result": response.model_dump(mode="json")}

    application_id, screening_result = submit_application_from_chat(
        session_id=state["session_id"],
        grant_type=grant_type,
        collected_fields=collected,
    )
    response = IntakeChatResponse(
        session_id=state["session_id"],
        intent=ChatIntent.application,
        grant_type=grant_type,
        reply="Application captured successfully. Eligibility screening has been completed.",
        collected_fields=collected,
        current_field_key=None,
        next_question=None,
        validation_error=validation_error,
        is_complete=True,
        is_submitted=True,
        application_id=application_id,
        screening_result=screening_result,
    )
    return {"result": response.model_dump(mode="json")}
