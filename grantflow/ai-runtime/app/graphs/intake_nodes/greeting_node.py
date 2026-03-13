from __future__ import annotations

from app.schemas.ai_models import ChatIntent, GrantType, IntakeChatResponse
from .common import get_session_id

_GRANT_CONTEXT = {
    GrantType.cdg: "You're working on a **CDG** application.",
    GrantType.eig: "You're working on an **EIG** application.",
    GrantType.ecag: "You're working on an **ECAG** application.",
}


def greeting_node(state: dict) -> dict:
    session_id = get_session_id(state)
    grant_type_value = state.get("grant_type")
    grant_type = GrantType(grant_type_value) if grant_type_value else None
    collected = state.get("collected_fields") or {}
    current_field_key = state.get("current_field_key")

    if grant_type and current_field_key:
        context = _GRANT_CONTEXT.get(grant_type, "")
        reply = (
            f"Hello! {context} "
            "You can continue filling your application or ask any grant-related questions."
        )
    elif grant_type and collected:
        context = _GRANT_CONTEXT.get(grant_type, "")
        replied_count = len(collected)
        reply = (
            f"Hello! {context} "
            f"You've answered {replied_count} field(s) so far. "
            "Type 'continue' to resume or ask a question."
        )
    else:
        reply = (
            "Hello! Welcome to GrantFlow. I can help you:\n\n"
            "• **Apply for a grant** — guided chat-based application form\n"
            "• **Answer questions** — eligibility, funding, process, documents\n\n"
            "Which grant are you interested in? (CDG, EIG, or ECAG)\n"
            "Or type **'apply'** to start your application."
        )

    response = IntakeChatResponse(
        session_id=session_id,
        intent=ChatIntent.greeting,
        grant_type=grant_type,
        reply=reply,
        collected_fields=collected,
        current_field_key=current_field_key,
    )
    return {"result": response.model_dump(mode="json")}
