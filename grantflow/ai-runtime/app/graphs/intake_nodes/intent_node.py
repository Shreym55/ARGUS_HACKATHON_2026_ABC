from __future__ import annotations

from app.llm.client import llm_client
from app.prompts.intent_prompt import INTENT_PROMPT
from app.schemas.ai_models import ChatIntent, IntentClassificationLLMOutput

from .common import heuristic_intent


def intent_node(state: dict) -> dict:
    heuristic = heuristic_intent(state["message"], state.get("current_field_key"))
    if heuristic is not None:
        return {"intent": heuristic.value}

    if llm_client.enabled:
        try:
            result = llm_client.invoke_structured(
                IntentClassificationLLMOutput,
                INTENT_PROMPT,
                {
                    "message": state["message"],
                    "has_grant_type": bool(state.get("grant_type")),
                    "has_current_field_key": bool(state.get("current_field_key")),
                },
            )
            return {"intent": result.intent.value}
        except Exception:
            return {"intent": ChatIntent.qna.value}

    return {"intent": ChatIntent.qna.value}
