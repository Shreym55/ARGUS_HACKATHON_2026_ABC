from __future__ import annotations

from app.data.chat_question_bank import QUESTION_BANK
from app.core.logging import get_logger
from app.llm.client import llm_client
from app.prompts.intent_prompt import INTENT_PROMPT
from app.schemas.ai_models import ChatIntent, GrantType, IntentClassificationLLMOutput

from .common import get_message, get_session_id

logger = get_logger("app.nodes.intent")


def _state_with_intent(state: dict, message: str, intent: ChatIntent) -> dict:
    return {
        "intent": intent.value,
        "session_id": get_session_id(state),
        "message": message,
        "user_msg": message,
        "grant_type": state.get("grant_type"),
        "collected_fields": state.get("collected_fields") or {},
        "current_field_key": state.get("current_field_key"),
    }


def _current_field_question(state: dict) -> str | None:
    current_field_key = state.get("current_field_key")
    grant_type_value = state.get("grant_type")
    if not current_field_key or not grant_type_value:
        return None
    try:
        grant_type = GrantType(grant_type_value)
    except ValueError:
        return None
    question_def = next(
        (question for question in QUESTION_BANK[grant_type] if question["key"] == current_field_key),
        None,
    )
    return question_def["question"] if question_def else None


def intent_node(state: dict) -> dict:
    message = get_message(state)
    current_field_key = state.get("current_field_key")
    if not llm_client.enabled:
        raise RuntimeError(
            f"Intent classification requires LLM, but it is disabled ({llm_client.disable_reason})."
        )

    collected_fields: dict = state.get("collected_fields") or {}
    logger.debug(
        "intent_llm_start",
        extra={
            "event": "intent_llm_start",
            "session_id": state.get("session_id"),
            "user_msg": message[:80],
            "grant_type": state.get("grant_type"),
        },
    )
    result = llm_client.invoke_structured(
        IntentClassificationLLMOutput,
        INTENT_PROMPT,
        {
            "user_msg": message,
            "has_grant_type": bool(state.get("grant_type")),
            "has_current_field_key": bool(current_field_key),
            "current_field_key": current_field_key,
            "current_field_question": _current_field_question(state),
            "grant_type": state.get("grant_type") or "not selected",
            "fields_collected_count": len(collected_fields),
        },
    )
    logger.info(
        "intent_llm_result",
        extra={
            "event": "intent_llm_result",
            "session_id": state.get("session_id"),
            "intent": result.intent.value,
            "reason": result.reason,
            "user_msg": message[:80],
        },
    )
    return _state_with_intent(state, message, result.intent)
