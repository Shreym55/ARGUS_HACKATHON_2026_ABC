from __future__ import annotations

from app.data.program_config import PROGRAM_CONFIGS
from app.llm.client import llm_client
from app.prompts.qna_prompt import QNA_PROMPT
from app.schemas.ai_models import ChatIntent, GrantType, IntakeChatResponse, QnaLLMOutput


def _base_qna_answer(grant_type: GrantType | None) -> str:
    if grant_type is None:
        return (
            "GrantFlow supports CDG, EIG, and ECAG grants. "
            "Share your grant type for exact eligibility and funding details."
        )

    cfg = PROGRAM_CONFIGS[grant_type]
    return (
        f"For {grant_type.value.upper()}, funding range is INR {int(cfg.min_amount):,} to "
        f"INR {int(cfg.max_amount):,}, duration is {cfg.min_duration_months}-{cfg.max_duration_months} months, "
        f"and overhead cap is {int(cfg.overhead_cap_ratio * 100)}%."
    )


def qna_node(state: dict) -> dict:
    grant_type_value = state.get("grant_type")
    grant_type = GrantType(grant_type_value) if grant_type_value else None
    base_answer = _base_qna_answer(grant_type)

    answer = base_answer
    if llm_client.enabled:
        try:
            response = llm_client.invoke_structured(
                QnaLLMOutput,
                QNA_PROMPT,
                {"question": state["message"], "base_facts": base_answer},
            )
            answer = response.answer
        except Exception:
            answer = base_answer

    result = IntakeChatResponse(
        session_id=state["session_id"],
        intent=ChatIntent.qna,
        grant_type=grant_type,
        reply=answer,
        collected_fields=state.get("collected_fields", {}),
        current_field_key=state.get("current_field_key"),
    )
    return {"result": result.model_dump(mode="json")}
