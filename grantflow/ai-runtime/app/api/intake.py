from fastapi import APIRouter

from app.schemas.ai_models import IntakeChatRequest, IntakeTurnRequest
from app.services.chat_intake_service import handle_intake_chat, handle_intake_turn

router = APIRouter(prefix="/intake", tags=["intake"])


@router.post("/chat")
def intake_chat(request: IntakeChatRequest) -> dict:
    return handle_intake_chat(request).model_dump(mode="json")


@router.post("/next-question")
def next_question(request: IntakeTurnRequest) -> dict:
    return handle_intake_turn(request).model_dump(mode="json")
