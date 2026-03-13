from __future__ import annotations

from datetime import date
from typing import Any

from app.data.chat_question_bank import QUESTION_BANK
from app.schemas.ai_models import IntakeTurnRequest, IntakeTurnResponse


def _validate_value(field_type: str, value: Any) -> str | None:
    if value is None:
        return "Value is required."

    if field_type == "int":
        try:
            int(value)
        except (TypeError, ValueError):
            return "Please provide a whole number."
    elif field_type == "float":
        try:
            float(value)
        except (TypeError, ValueError):
            return "Please provide a numeric value."
    elif field_type == "email":
        value_str = str(value).strip()
        if "@" not in value_str or "." not in value_str.split("@")[-1]:
            return "Please provide a valid email address."
    elif field_type == "date":
        try:
            date.fromisoformat(str(value))
        except ValueError:
            return "Please provide date in YYYY-MM-DD format."
    else:
        if not str(value).strip():
            return "Please provide a non-empty value."

    return None


def handle_intake_turn(request: IntakeTurnRequest) -> IntakeTurnResponse:
    questions = QUESTION_BANK[request.grant_type]
    collected = dict(request.collected_fields)
    validation_error = None

    if request.last_field_key:
        question_def = next((q for q in questions if q["key"] == request.last_field_key), None)
        if question_def:
            validation_error = _validate_value(question_def["type"], request.last_answer)
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
