from __future__ import annotations

from app.schemas.ai_models import ChatIntent, IntakeChatResponse


def greeting_node(state: dict) -> dict:
    response = IntakeChatResponse(
        session_id=state["session_id"],
        intent=ChatIntent.greeting,
        grant_type=state.get("grant_type"),
        reply=(
            "Hello. I can help with grant Q&A or start your application form in chat. "
            "Say 'start application' to begin."
        ),
        collected_fields=state.get("collected_fields", {}),
        current_field_key=state.get("current_field_key"),
    )
    return {"result": response.model_dump(mode="json")}
