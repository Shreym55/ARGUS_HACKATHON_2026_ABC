from __future__ import annotations

from uuid import uuid4

from app.schemas.ai_models import (
    ApplicationData,
    BudgetLine,
    GrantType,
    ProjectLocation,
    ScreeningRequest,
)
from app.services.application_store import save_application_record
from app.services.orchestrator_service import orchestrator_service


def _to_int(value: object, default: int | None = None) -> int | None:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value: object, default: float | None = None) -> float | None:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_grade_levels(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    return [token.strip() for token in str(value).split(",") if token.strip()]


def _parse_project_location(value: object) -> ProjectLocation | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    parts = [segment.strip() for segment in text.split(",") if segment.strip()]
    district = parts[0] if parts else None
    state = parts[1] if len(parts) > 1 else None
    return ProjectLocation(district=district, state=state)


def _build_budget_lines(collected: dict, requested_amount: float) -> list[BudgetLine]:
    lines = []
    overheads = _to_float(collected.get("overheads_amount"))
    if overheads and overheads > 0:
        lines.append(BudgetLine(category="overheads", amount=overheads))
        remaining = max(0.0, requested_amount - overheads)
        lines.append(BudgetLine(category="project_costs", amount=remaining))
    else:
        lines.append(BudgetLine(category="project_costs", amount=requested_amount))
    return lines


def build_application_from_chat(grant_type: GrantType, collected_fields: dict) -> ApplicationData:
    requested_amount = _to_float(collected_fields.get("requested_amount"), default=0.0) or 0.0
    app_id = str(uuid4())

    app = ApplicationData(
        application_id=app_id,
        grant_type=grant_type,
        organisation_type=str(collected_fields.get("organisation_type", "unknown")),
        year_established=_to_int(collected_fields.get("year_established")),
        requested_amount=requested_amount,
        project_title=str(collected_fields.get("project_title", "Untitled Project")),
        project_description=str(collected_fields.get("budget_justification", "")) or None,
        problem_statement=str(collected_fields.get("problem_statement", "")) or None,
        proposed_solution=str(collected_fields.get("proposed_solution", "")) or None,
        expected_outcomes=str(collected_fields.get("expected_outcomes", "")) or None,
        beneficiary_demographics=str(collected_fields.get("beneficiary_demographics", "")) or None,
        beneficiary_count=_to_int(collected_fields.get("beneficiary_count")),
        schools_targeted=_to_int(collected_fields.get("schools_targeted")),
        grade_levels=_parse_grade_levels(collected_fields.get("grade_levels")),
        project_start_date=collected_fields.get("project_start_date"),
        project_end_date=collected_fields.get("project_end_date"),
        budget_lines=_build_budget_lines(collected_fields, requested_amount),
        overheads_amount=_to_float(collected_fields.get("overheads_amount")),
        community_involvement_plan=(
            str(collected_fields.get("community_involvement_plan", "")) or None
        ),
        project_location=_parse_project_location(collected_fields.get("project_location")),
    )
    return app


def submit_application_from_chat(
    *,
    session_id: str,
    grant_type: GrantType,
    collected_fields: dict,
) -> tuple[str, dict]:
    application = build_application_from_chat(grant_type, collected_fields)
    screening_result = orchestrator_service.run_screening(
        ScreeningRequest(application=application)
    )
    save_application_record(
        application_id=application.application_id or str(uuid4()),
        session_id=session_id,
        grant_type=grant_type.value,
        application_payload=application.model_dump(mode="json"),
        screening_result=screening_result,
    )
    return application.application_id or "", screening_result
