from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.services.chat_intake_service import (
    clear_session,
    handle_intake_chat_ws,
)

router = APIRouter(prefix="/intake", tags=["intake"])
logger = get_logger("app.api.intake")


@router.websocket("/ws/{session_id}")
async def intake_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket chat endpoint.
    Connection: ws://<host>/api/v1/intake/ws/<session_id>

    Client sends JSON:
      { "message": "<text>", "grant_type": "cdg|eig|ecag" }  // grant_type optional

    Server responds with IntakeChatResponse JSON on every turn.
    Connection closes when is_submitted = true.
    """
    await websocket.accept()
    logger.info(
        "ws_connect",
        extra={"event": "ws_connect", "session_id": session_id},
    )

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning(
                    "ws_invalid_json",
                    extra={"event": "ws_invalid_json", "session_id": session_id, "raw": raw[:200]},
                )
                await websocket.send_json({
                    "error": "Invalid JSON. Send: {\"message\": \"...\", \"grant_type\": \"cdg|eig|ecag\"}"
                })
                continue

            user_message: str = str(data.get("message", "")).strip()
            grant_type_override: str | None = data.get("grant_type")

            if not user_message:
                await websocket.send_json({"error": "Field 'message' is required and must not be empty."})
                continue

            logger.info(
                "ws_message",
                extra={
                    "event": "ws_message",
                    "session_id": session_id,
                    "user_msg": user_message[:120],
                    "grant_type_override": grant_type_override,
                },
            )

            try:
                response = handle_intake_chat_ws(
                    session_id=session_id,
                    message=user_message,
                    grant_type_override=grant_type_override,
                )
            except ValueError as exc:
                logger.warning(
                    "ws_validation_error",
                    extra={"event": "ws_validation_error", "session_id": session_id, "error": str(exc)},
                )
                await websocket.send_json({"error": str(exc)})
                continue
            except Exception as exc:
                logger.error(
                    "ws_turn_error",
                    extra={"event": "ws_turn_error", "session_id": session_id, "error": str(exc)},
                    exc_info=True,
                )
                await websocket.send_json({"error": "Internal chat processing error. Please retry."})
                continue

            logger.info(
                "ws_response",
                extra={
                    "event": "ws_response",
                    "session_id": session_id,
                    "intent": response.intent.value,
                    "is_submitted": response.is_submitted,
                },
            )

            await websocket.send_json(response.model_dump(mode="json"))

            if response.is_submitted:
                logger.info(
                    "ws_application_submitted",
                    extra={
                        "event": "ws_application_submitted",
                        "session_id": session_id,
                        "application_id": response.application_id,
                    },
                )
                clear_session(session_id)
                await websocket.close(code=1000, reason="Application submitted")
                break
    except WebSocketDisconnect:
        logger.info(
            "ws_disconnect",
            extra={"event": "ws_disconnect", "session_id": session_id},
        )
