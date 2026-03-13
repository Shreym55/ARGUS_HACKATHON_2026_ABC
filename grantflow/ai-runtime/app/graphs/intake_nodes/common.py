from __future__ import annotations

import re
from datetime import date
from typing import Any

from app.data.chat_question_bank import QUESTION_BANK
from app.schemas.ai_models import ChatIntent, GrantType

GREETING_KEYWORDS = {"hi", "hello", "hey", "good morning", "good evening", "good afternoon"}
APPLICATION_KEYWORDS = {
    "apply",
    "application",
    "submit grant",
    "start grant",
    "fill form",
    "chatbot form",
}
QNA_KEYWORDS = {
    "grant",
    "eligibility",
    "screening",
    "deadline",
    "funding",
    "cdg",
    "eig",
    "ecag",
    "review",
    "compliance",
}
OUT_OF_SCOPE_KEYWORDS = {"joke", "movie", "recipe", "sports", "stock", "crypto", "politics"}


def get_message(state: dict) -> str:
    """
    Backward-compatible message accessor for intake graph state.
    Supports both `message` (current) and `user_msg` (legacy).
    """
    message = state.get("message")
    if message is None:
        message = state.get("user_msg")
    return str(message or "").strip()


def get_session_id(state: dict) -> str:
    return str(state.get("session_id") or "")


def validate_value(field_type: str, value: Any) -> str | None:
    if value is None:
        return "Value is required."

    if field_type == "int":
        try:
            int(value)
        except (TypeError, ValueError):
            return "Please provide a whole number."
    elif field_type == "float":
        try:
            float(value)
        except (TypeError, ValueError):
            return "Please provide a numeric value."
    elif field_type == "email":
        value_str = str(value).strip()
        if "@" not in value_str or "." not in value_str.split("@")[-1]:
            return "Please provide a valid email address."
    elif field_type == "date":
        try:
            date.fromisoformat(str(value))
        except ValueError:
            return "Please provide date in YYYY-MM-DD format."
    else:
        if not str(value).strip():
            return "Please provide a non-empty value."

    return None


def extract_answer(field_type: str, message: str) -> Any:
    text = message.strip()
    if field_type == "email":
        match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        return match.group(0) if match else text
    if field_type == "date":
        match = re.search(r"\b\d{4}-\d{2}-\d{2}\b", text)
        return match.group(0) if match else text
    if field_type == "int":
        match = re.search(r"-?\d+", text)
        return int(match.group(0)) if match else text
    if field_type == "float":
        match = re.search(r"-?\d+(?:\.\d+)?", text.replace(",", ""))
        return float(match.group(0)) if match else text
    return text


def next_missing_question(grant_type: GrantType, collected: dict[str, Any]) -> dict | None:
    return next((q for q in QUESTION_BANK[grant_type] if q["key"] not in collected), None)


def heuristic_intent(message: str, current_field_key: str | None) -> ChatIntent | None:
    if current_field_key:
        return ChatIntent.application

    lowered = message.lower().strip()
    if lowered in GREETING_KEYWORDS:
        return ChatIntent.greeting
    if any(token in lowered for token in APPLICATION_KEYWORDS):
        return ChatIntent.application
    if any(token in lowered for token in OUT_OF_SCOPE_KEYWORDS):
        return ChatIntent.out_of_scope
    if "?" in lowered or any(token in lowered for token in QNA_KEYWORDS):
        return ChatIntent.qna
    return None


def intake_route_condition(state: dict) -> str:
    return state["intent"]
