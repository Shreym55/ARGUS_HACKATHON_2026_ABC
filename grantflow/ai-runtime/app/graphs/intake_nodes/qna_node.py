from __future__ import annotations

from app.core.logging import get_logger
from app.data.program_config import PROGRAM_CONFIGS
from app.llm.client import llm_client
from app.prompts.qna_prompt import QNA_PROMPT
from app.schemas.ai_models import ChatIntent, GrantType, IntakeChatResponse, QnaLLMOutput
from .common import get_message, get_session_id

logger = get_logger("app.nodes.qna")


def _build_base_facts(grant_type: GrantType | None) -> str:
    if grant_type is None:
        return (
            "User has not selected a grant type yet. "
            "GrantFlow supports three programmes: CDG (Community Development Grant), "
            "EIG (Education Innovation Grant), and ECAG (Environment & Climate Action Grant)."
        )
    cfg = PROGRAM_CONFIGS[grant_type]
    return (
        f"Grant type: {grant_type.value.upper()}. "
        f"Funding range: INR {int(cfg.min_amount):,} to INR {int(cfg.max_amount):,}. "
        f"Duration: {cfg.min_duration_months}–{cfg.max_duration_months} months. "
        f"Overhead cap: {int(cfg.overhead_cap_ratio * 100)}%. "
        f"Eligible org types: {', '.join(cfg.allowed_org_types)}. "
        f"Thematic alignment threshold: {cfg.thematic_threshold}/100."
    )


def qna_node(state: dict) -> dict:
    session_id = get_session_id(state)
    question = get_message(state)
    grant_type_value = state.get("grant_type")
    grant_type = GrantType(grant_type_value) if grant_type_value else None
    base_facts = _build_base_facts(grant_type)

    logger.info(
        "qna_question",
        extra={
            "event": "qna_question",
            "session_id": session_id,
            "question": question[:120],
            "grant_type": grant_type_value,
            "llm_enabled": llm_client.enabled,
            "llm_disable_reason": llm_client.disable_reason,
        },
    )

    answer = base_facts
    if llm_client.enabled:
        try:
            response = llm_client.invoke_structured(
                QnaLLMOutput,
                QNA_PROMPT,
                {
                    "question": question,
                    "grant_type": grant_type.value if grant_type else "not selected",
                    "base_facts": base_facts,
                },
            )
            answer = response.answer
            logger.info(
                "qna_answered",
                extra={
                    "event": "qna_answered",
                    "session_id": session_id,
                    "answer_length": len(answer),
                    "source": "llm",
                },
            )
        except Exception as exc:
            answer = (
                "GrantFlow supports CDG, EIG, and ECAG grants. "
                "For specific details, please share your grant type or contact a Program Officer."
            )
            logger.warning(
                "qna_fallback",
                extra={
                    "event": "qna_fallback",
                    "session_id": session_id,
                    "error": str(exc),
                    "source": "base_facts_fallback",
                },
            )
    else:
        logger.warning(
            "qna_llm_disabled",
            extra={
                "event": "qna_llm_disabled",
                "session_id": session_id,
                "disable_reason": llm_client.disable_reason,
            },
        )
        logger.info(
            "qna_answered",
            extra={
                "event": "qna_answered",
                "session_id": session_id,
                "answer_length": len(answer),
                "source": "base_facts_no_llm",
            },
        )

    result = IntakeChatResponse(
        session_id=session_id,
        intent=ChatIntent.qna,
        grant_type=grant_type,
        reply=answer,
        collected_fields=state.get("collected_fields", {}),
        current_field_key=state.get("current_field_key"),
    )
    return {"result": result.model_dump(mode="json")}
