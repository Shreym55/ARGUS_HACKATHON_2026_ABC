from __future__ import annotations

from app.core.logging import get_logger
from app.llm.client import llm_client
from app.prompts.intent_prompt import INTENT_PROMPT
from app.schemas.ai_models import ChatIntent, IntentClassificationLLMOutput

from .common import get_message, get_session_id, heuristic_intent

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


def intent_node(state: dict) -> dict:
    message = get_message(state)
    current_field_key = state.get("current_field_key")

    # ── Fast path: heuristic ───────────────────────────────────────────────────
    heuristic = heuristic_intent(message, current_field_key)
    if heuristic is not None:
        logger.info(
            "intent_heuristic",
            extra={
                "event": "intent_heuristic",
                "session_id": state.get("session_id"),
                "intent": heuristic.value,
                "user_msg": message[:80],
                "trigger": "current_field_key" if current_field_key else "keyword",
            },
        )
        return _state_with_intent(state, message, heuristic)

    # ── LLM classification ─────────────────────────────────────────────────────
    if llm_client.enabled:
        try:
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
        except Exception as exc:
            logger.warning(
                "intent_llm_fallback",
                extra={
                    "event": "intent_llm_fallback",
                    "session_id": state.get("session_id"),
                    "error": str(exc),
                    "fallback_intent": ChatIntent.qna.value,
                },
            )

    logger.info(
        "intent_default",
        extra={
            "event": "intent_default",
            "session_id": state.get("session_id"),
            "intent": ChatIntent.qna.value,
            "reason": "llm_disabled_or_failed",
        },
    )
    return _state_with_intent(state, message, ChatIntent.qna)
