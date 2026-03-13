from __future__ import annotations

import time
import uuid
from typing import Any

from app.core.logging import get_logger, set_request_id
from app.graphs.intake_graph import get_intake_graph
from app.schemas.ai_models import (
    GrantType,
    IntakeChatRequest,
    IntakeChatResponse,
)

logger = get_logger("app.intake")

# ── In-memory session store ───────────────────────────────────────────────────
_sessions: dict[str, dict[str, Any]] = {}


def get_session(session_id: str) -> dict[str, Any]:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "session_id": session_id,
            "grant_type": None,
            "collected_fields": {},
            "current_field_key": None,
        }
        logger.info(
            "session_created",
            extra={"event": "session_created", "session_id": session_id},
        )
    return _sessions[session_id]


def update_session(session_id: str, response: IntakeChatResponse) -> None:
    session = get_session(session_id)
    if response.grant_type:
        session["grant_type"] = response.grant_type.value
    session["collected_fields"] = response.collected_fields
    session["current_field_key"] = response.current_field_key
    if response.is_submitted:
        session["is_submitted"] = True


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)
    logger.info(
        "session_cleared",
        extra={"event": "session_cleared", "session_id": session_id},
    )


# ── Orchestrator ──────────────────────────────────────────────────────────────

class IntakeOrchestratorService:
    def __init__(self) -> None:
        self._graph = get_intake_graph()

    def run_chat_turn(self, request: IntakeChatRequest) -> IntakeChatResponse:
        state = {
            "session_id": request.session_id,
            "message": request.message,
            "user_msg": request.message,
            "grant_type": request.grant_type.value if request.grant_type else None,
            "collected_fields": request.collected_fields,
            "current_field_key": request.current_field_key,
        }
        result = self._graph.invoke(state)
        return IntakeChatResponse.model_validate(result["result"])


intake_orchestrator_service = IntakeOrchestratorService()


def handle_intake_chat_ws(
    session_id: str,
    message: str,
    grant_type_override: str | None = None,
) -> IntakeChatResponse:
    rid = f"ws-{session_id[:8]}-{str(uuid.uuid4())[:6]}"
    set_request_id(rid)

    session = get_session(session_id)
    if grant_type_override:
        normalized_grant = grant_type_override.strip().lower()
        session["grant_type"] = GrantType(normalized_grant).value

    grant_type_value = session.get("grant_type")
    fields_before = len(session.get("collected_fields", {}))
    start = time.perf_counter()

    logger.info(
        "intake_turn_start",
        extra={
            "event": "intake_turn_start",
            "session_id": session_id,
            "user_msg": message[:120],
            "grant_type": grant_type_value,
            "current_field_key": session.get("current_field_key"),
            "fields_collected": fields_before,
            "transport": "websocket",
        },
    )

    request = IntakeChatRequest(
        session_id=session_id,
        message=message,
        grant_type=GrantType(grant_type_value) if grant_type_value else None,
        collected_fields=session.get("collected_fields", {}),
        current_field_key=session.get("current_field_key"),
    )
    response = intake_orchestrator_service.run_chat_turn(request)
    update_session(session_id, response)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        "intake_turn_end",
        extra={
            "event": "intake_turn_end",
            "session_id": session_id,
            "intent": response.intent.value,
            "reply_length": len(response.reply),
            "fields_now": len(response.collected_fields),
            "new_field_key": response.current_field_key,
            "is_complete": response.is_complete,
            "is_submitted": response.is_submitted,
            "elapsed_ms": elapsed_ms,
            "transport": "websocket",
        },
    )

    return response
