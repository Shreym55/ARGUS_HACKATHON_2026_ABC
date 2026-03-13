from __future__ import annotations

import time
from datetime import datetime, timezone
from uuid import uuid4

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.ai_models import (
    ComplianceResult,
    GrantType,
    GraphExecutionResult,
    ReviewPackageResult,
    ScreeningResult,
    TaskType,
)

logger = get_logger("app.nodes.pipeline")


def _with_updates(state: dict, **updates) -> dict:
    next_state = dict(state)
    next_state.update(updates)
    return next_state


def load_payload_node(state: dict) -> dict:
    run_id = state.get("run_id") or str(uuid4())
    task_type = TaskType(state["task_type"])
    payload = state["payload"]

    grant_type_raw = None
    if task_type in (TaskType.screening, TaskType.review_package):
        grant_type_raw = payload["application"]["grant_type"]
    elif task_type == TaskType.compliance:
        grant_type_raw = payload["payload"]["grant_type"]

    grant_type = GrantType(grant_type_raw)
    settings = get_settings()
    model = settings.openai_model if not settings.ai_disable_llm else "rule-based"

    logger.info(
        "pipeline_start",
        extra={
            "event": "pipeline_start",
            "run_id": run_id,
            "task_type": task_type.value,
            "grant_type": grant_type.value,
            "model": model,
        },
    )
    return _with_updates(
        state,
        run_id=run_id,
        task_type=task_type.value,
        grant_type=grant_type.value,
        model=model,
        _pipeline_start_ts=time.perf_counter(),
        payload=payload,
    )


def route_task_node(state: dict) -> dict:
    route = state["task_type"]
    logger.debug(
        "pipeline_route",
        extra={"event": "pipeline_route", "run_id": state.get("run_id"), "route": route},
    )
    return _with_updates(state, route=route)


def route_task_condition(state: dict) -> str:
    return state["route"]


def policy_guard_node(state: dict) -> dict:
    merged = dict(state["merged_result"])
    guard_note = "AI output is advisory. Human staff must confirm, modify, or override."

    task_type = TaskType(state["task_type"])
    if task_type == TaskType.screening:
        merged["summary"] = f"{merged['summary']} {guard_note}"
    elif task_type == TaskType.review_package:
        merged["reviewer_notice"] = guard_note
    elif task_type == TaskType.compliance:
        merged["summary"] = f"{merged['summary']} {guard_note}"

    logger.debug(
        "policy_guard_applied",
        extra={"event": "policy_guard_applied", "run_id": state.get("run_id"), "task_type": state["task_type"]},
    )
    return _with_updates(state, merged_result=merged)


def format_output_node(state: dict) -> dict:
    now = datetime.now(timezone.utc)
    run_id = state["run_id"]
    model = state["model"]
    task_type = TaskType(state["task_type"])
    merged = state["merged_result"]

    if task_type == TaskType.screening:
        result = ScreeningResult(run_id=run_id, generated_at=now, model=model, **merged)
    elif task_type == TaskType.review_package:
        result = ReviewPackageResult(run_id=run_id, generated_at=now, model=model, **merged)
    else:
        result = ComplianceResult(run_id=run_id, generated_at=now, model=model, **merged)

    wrapper = GraphExecutionResult(
        run_id=run_id,
        task_type=task_type,
        result=result.model_dump(mode="json"),
    )
    return _with_updates(state, formatted_result=wrapper.model_dump(mode="json"))


def persist_artifacts_node(state: dict) -> dict:
    run_id = state.get("run_id", "?")
    task_type = state.get("task_type", "?")
    start_ts = state.get("_pipeline_start_ts")
    elapsed_ms = round((time.perf_counter() - start_ts) * 1000, 1) if start_ts else None

    logger.info(
        "pipeline_complete",
        extra={
            "event": "pipeline_complete",
            "run_id": run_id,
            "task_type": task_type,
            "elapsed_ms": elapsed_ms,
        },
    )
    output = dict(state["formatted_result"])
    output["persisted"] = True
    return _with_updates(state, formatted_result=output)
