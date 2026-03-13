from __future__ import annotations

from app.schemas.ai_models import ChatIntent, IntakeChatResponse


def out_of_scope_node(state: dict) -> dict:
    response = IntakeChatResponse(
        session_id=state["session_id"],
        intent=ChatIntent.out_of_scope,
        grant_type=state.get("grant_type"),
        reply="I can only help with GrantFlow grant questions, application intake, and compliance workflows.",
        collected_fields=state.get("collected_fields", {}),
        current_field_key=state.get("current_field_key"),
    )
    return {"result": response.model_dump(mode="json")}
