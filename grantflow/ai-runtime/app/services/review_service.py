from __future__ import annotations

from app.data.program_config import get_program_config
from app.schemas.ai_models import (
    ApplicationData,
    GrantType,
    RiskFlag,
    ScoreSuggestion,
    SeverityLevel,
)


def build_deterministic_risk_flags(application: ApplicationData) -> list[RiskFlag]:
    flags: list[RiskFlag] = []

    if application.requested_amount > 0:
        for line in application.budget_lines:
            if (line.amount / application.requested_amount) > 0.6:
                flags.append(
                    RiskFlag(
                        category="budget_anomaly",
                        severity=SeverityLevel.high,
                        message=f"Budget line '{line.category}' exceeds 60% of total requested amount.",
                        evidence_refs=["budget_lines", "requested_amount"],
                        source="deterministic",
                    )
                )
                break

    duration_months = None
    if application.project_start_date and application.project_end_date:
        duration_months = max(
            0,
            (application.project_end_date.year - application.project_start_date.year) * 12
            + (application.project_end_date.month - application.project_start_date.month),
        )

    if duration_months is not None and duration_months < max(1, len(application.key_activities) // 2):
        flags.append(
            RiskFlag(
                category="timeline_risk",
                severity=SeverityLevel.medium,
                message="Project timeline may be too short for listed activities.",
                evidence_refs=["project_start_date", "project_end_date", "key_activities"],
                source="deterministic",
            )
        )

    outcomes_text = (application.expected_outcomes or "").lower()
    has_numeric_signal = any(char.isdigit() for char in outcomes_text)
    if len(outcomes_text) < 80 or not has_numeric_signal:
        flags.append(
            RiskFlag(
                category="vague_outcomes",
                severity=SeverityLevel.medium,
                message="Expected outcomes appear vague or non-measurable.",
                evidence_refs=["expected_outcomes"],
                source="deterministic",
            )
        )

    beneficiaries = application.beneficiary_count or 0
    team_size = application.team_size or 0
    if beneficiaries > 0 and team_size > 0 and beneficiaries / team_size > 2000:
        flags.append(
            RiskFlag(
                category="team_capacity_risk",
                severity=SeverityLevel.medium,
                message="Team size appears low relative to beneficiary scope.",
                evidence_refs=["beneficiary_count", "team_size"],
                source="deterministic",
            )
        )

    if (application.prior_incomplete_projects_count or 0) > 0:
        flags.append(
            RiskFlag(
                category="prior_grant_history_risk",
                severity=SeverityLevel.high,
                message="Prior grant history indicates incomplete projects.",
                evidence_refs=["prior_incomplete_projects_count", "prior_grant_history"],
                source="deterministic",
            )
        )

    return flags


def compute_composite_ai_score(grant_type: GrantType, suggestions: list[ScoreSuggestion]) -> float | None:
    if not suggestions:
        return None

    cfg = get_program_config(grant_type)
    weight_map = {dimension.name.lower(): dimension.weight for dimension in cfg.rubric}
    total_weight = 0
    weighted_score = 0.0

    for suggestion in suggestions:
        weight = weight_map.get(suggestion.dimension.lower(), suggestion.weight)
        total_weight += weight
        weighted_score += suggestion.score * weight

    if total_weight == 0:
        return None

    return round(weighted_score / total_weight, 2)
