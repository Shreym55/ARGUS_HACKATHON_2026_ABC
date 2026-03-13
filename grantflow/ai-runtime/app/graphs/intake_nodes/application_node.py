from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.data.chat_question_bank import QUESTION_BANK
from app.llm.client import llm_client
from app.prompts.application_prompt import APPLICATION_FIELD_EXTRACTION_PROMPT
from app.schemas.ai_models import (
    ChatIntent,
    FieldExtractionLLMOutput,
    GrantType,
    IntakeChatResponse,
)
from app.services.application_submission_service import submit_application_from_chat

from .common import extract_answer, get_message, get_session_id, next_missing_question, validate_value

logger = get_logger("app.nodes.application")

_GRANT_TYPE_ALIASES: dict[str, str] = {
    "community development": "cdg",
    "education innovation": "eig",
    "environment": "ecag",
    "climate": "ecag",
}

_GRANT_SELECTION_QUESTIONS = {
    GrantType.cdg: "Great! You've selected the Community Development Grant (CDG). Let's get started.\n\n",
    GrantType.eig: "Great! You've selected the Education Innovation Grant (EIG). Let's get started.\n\n",
    GrantType.ecag: "Great! You've selected the Environment & Climate Action Grant (ECAG). Let's get started.\n\n",
}


def _extract_grant_type(message: str) -> GrantType | None:
    lowered = message.lower().strip()
    for key, val in _GRANT_TYPE_ALIASES.items():
        if key in lowered:
            return GrantType(val)
    for gt in GrantType:
        if gt.value in lowered:
            return gt
    return None


def _llm_extract(field_key: str, field_type: str, question: str, message: str) -> Any | None:
    if not llm_client.enabled:
        return None
    try:
        result = llm_client.invoke_structured(
            FieldExtractionLLMOutput,
            APPLICATION_FIELD_EXTRACTION_PROMPT,
            {
                "field_key": field_key,
                "field_type": field_type,
                "question": question,
                "user_msg": message,
            },
        )
        if result.extracted is not None and result.confidence in ("high", "medium"):
            return result.extracted
    except Exception:
        pass
    return None


def application_node(state: dict) -> dict:
    session_id: str = get_session_id(state)
    message: str = get_message(state)
    grant_type_value = state.get("grant_type")
    collected: dict[str, Any] = dict(state.get("collected_fields") or {})
    current_field_key: str | None = state.get("current_field_key")
    validation_error: str | None = None

    # ── Step 1: Resolve grant type ────────────────────────────────────────────
    if not grant_type_value:
        detected = _extract_grant_type(message)
        if detected:
            grant_type_value = detected.value
            logger.info(
                "application_grant_detected",
                extra={
                    "event": "application_grant_detected",
                    "session_id": session_id,
                    "grant_type": grant_type_value,
                    "user_msg": message[:80],
                },
            )
        else:
            logger.info(
                "application_grant_prompt",
                extra={
                    "event": "application_grant_prompt",
                    "session_id": session_id,
                    "user_msg": message[:80],
                },
            )
            response = IntakeChatResponse(
                session_id=session_id,
                intent=ChatIntent.application,
                reply=(
                    "Which grant programme would you like to apply for?\n\n"
                    "• **CDG** — Community Development Grant (INR 2L–20L, 6–18 months)\n"
                    "• **EIG** — Education Innovation Grant (INR 5L–50L, 12–24 months)\n"
                    "• **ECAG** — Environment & Climate Action Grant (INR 3L–30L, 6–24 months)\n\n"
                    "Just type the grant name or code."
                ),
                grant_type=None,
                collected_fields=collected,
                is_complete=False,
            )
            return {"result": response.model_dump(mode="json")}

    grant_type = GrantType(grant_type_value)
    questions = QUESTION_BANK[grant_type]

    # ── Step 2: Process answer for active field ───────────────────────────────
    if current_field_key:
        question_def = next((q for q in questions if q["key"] == current_field_key), None)
        if question_def:
            field_type = question_def["type"]
            logger.debug(
                "application_field_attempt",
                extra={
                    "event": "application_field_attempt",
                    "session_id": session_id,
                    "field_key": current_field_key,
                    "field_type": field_type,
                    "user_msg": message[:80],
                },
            )

            if field_type == "text" and llm_client.enabled:
                llm_candidate = _llm_extract(
                    current_field_key, field_type, question_def["question"], message
                )
                if llm_candidate is not None:
                    logger.debug(
                        "application_field_llm_extract",
                        extra={
                            "event": "application_field_llm_extract",
                            "session_id": session_id,
                            "field_key": current_field_key,
                            "extracted_length": len(str(llm_candidate)),
                        },
                    )
                candidate = llm_candidate if llm_candidate is not None else extract_answer(field_type, message)
            else:
                candidate = extract_answer(field_type, message)

            validation_error = validate_value(field_type, candidate)
            if validation_error:
                logger.warning(
                    "application_field_invalid",
                    extra={
                        "event": "application_field_invalid",
                        "session_id": session_id,
                        "field_key": current_field_key,
                        "error": validation_error,
                        "user_msg": message[:80],
                    },
                )
            else:
                collected[current_field_key] = candidate
                logger.info(
                    "application_field_accepted",
                    extra={
                        "event": "application_field_accepted",
                        "session_id": session_id,
                        "field_key": current_field_key,
                        "fields_total": len(collected),
                    },
                )

    # ── Step 3: Next question ─────────────────────────────────────────────────
    next_question = next_missing_question(grant_type, collected)
    total_fields = len(questions)
    answered = len(collected)

    if next_question:
        prefix = _GRANT_SELECTION_QUESTIONS.get(grant_type, "") if not current_field_key and not collected else ""
        progress = f"({answered}/{total_fields}) " if answered > 0 else ""

        if validation_error:
            reply = f"⚠️ {validation_error}\n\n{progress}{next_question['question']}"
        else:
            reply = f"{prefix}{progress}{next_question['question']}"

        logger.info(
            "application_next_question",
            extra={
                "event": "application_next_question",
                "session_id": session_id,
                "next_field_key": next_question["key"],
                "answered": answered,
                "total": total_fields,
                "grant_type": grant_type_value,
            },
        )
        response = IntakeChatResponse(
            session_id=session_id,
            intent=ChatIntent.application,
            grant_type=grant_type,
            reply=reply,
            collected_fields=collected,
            current_field_key=next_question["key"],
            next_question=next_question["question"],
            validation_error=validation_error,
            is_complete=False,
            is_submitted=False,
        )
        return {"result": response.model_dump(mode="json")}

    # ── Step 4: Submit ────────────────────────────────────────────────────────
    logger.info(
        "application_submitting",
        extra={
            "event": "application_submitting",
            "session_id": session_id,
            "grant_type": grant_type_value,
            "fields_count": len(collected),
        },
    )
    application_id, screening_result = submit_application_from_chat(
        session_id=session_id,
        grant_type=grant_type,
        collected_fields=collected,
    )

    screening_payload = (
        screening_result.get("result", {}) if isinstance(screening_result, dict) else {}
    )
    screening_rec = (
        screening_payload.get("overall_recommendation")
        or (screening_result.get("overall_recommendation") if isinstance(screening_result, dict) else None)
        or "unknown"
    )
    logger.info(
        "application_submitted",
        extra={
            "event": "application_submitted",
            "session_id": session_id,
            "application_id": application_id,
            "grant_type": grant_type_value,
            "screening_recommendation": screening_rec,
            "screening_result": screening_result,
        },
    )

    reply = (
        "✅ Your application has been submitted successfully!\n\n"
        f"Application ID: **{application_id}**\n"
        f"Eligibility screening result: **{screening_rec}**\n\n"
        "A Program Officer will review your application and contact you shortly."
    )
    response = IntakeChatResponse(
        session_id=session_id,
        intent=ChatIntent.application,
        grant_type=grant_type,
        reply=reply,
        collected_fields=collected,
        current_field_key=None,
        next_question=None,
        validation_error=None,
        is_complete=True,
        is_submitted=True,
        application_id=application_id,
        screening_result=screening_result,
    )
    return {"result": response.model_dump(mode="json")}
