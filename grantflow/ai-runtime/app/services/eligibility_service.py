from __future__ import annotations

from datetime import date

from app.data.program_config import get_program_config
from app.schemas.ai_models import (
    ApplicationData,
    GrantType,
    HardCheckResult,
    SeverityLevel,
    SoftFlag,
)


def _months_between(start: date | None, end: date | None) -> int | None:
    if not start or not end:
        return None
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def _org_type_normalized(org_type: str) -> str:
    return " ".join(org_type.lower().strip().split())


def _budget_total(application: ApplicationData) -> float:
    return sum(line.amount for line in application.budget_lines)


def _overheads_amount(application: ApplicationData) -> float:
    if application.overheads_amount is not None:
        return application.overheads_amount

    for line in application.budget_lines:
        if "overhead" in line.category.lower():
            return line.amount
    return 0.0


def run_hard_checks(application: ApplicationData) -> list[HardCheckResult]:
    cfg = get_program_config(application.grant_type)
    checks: list[HardCheckResult] = []

    org_type = _org_type_normalized(application.organisation_type)
    allowed = any(allowed_type in org_type for allowed_type in cfg.allowed_org_types)
    checks.append(
        HardCheckResult(
            check_code="ORG_TYPE",
            check_name="Organisation type allowed",
            passed=allowed,
            reason=(
                "Organisation type is allowed."
                if allowed
                else f"Organisation type '{application.organisation_type}' is not eligible."
            ),
            evidence_fields=["organisation_type"],
        )
    )

    requested_ok = cfg.min_amount <= application.requested_amount <= cfg.max_amount
    checks.append(
        HardCheckResult(
            check_code="FUNDING_RANGE",
            check_name="Requested amount within funding range",
            passed=requested_ok,
            reason=(
                "Requested amount is within range."
                if requested_ok
                else f"Requested amount should be between {cfg.min_amount} and {cfg.max_amount}."
            ),
            evidence_fields=["requested_amount"],
        )
    )

    duration_months = _months_between(application.project_start_date, application.project_end_date)
    duration_ok = duration_months is not None and cfg.min_duration_months <= duration_months <= cfg.max_duration_months
    checks.append(
        HardCheckResult(
            check_code="PROJECT_DURATION",
            check_name="Project duration within allowed range",
            passed=duration_ok,
            reason=(
                "Project duration is valid."
                if duration_ok
                else f"Project duration should be between {cfg.min_duration_months} and {cfg.max_duration_months} months."
            ),
            evidence_fields=["project_start_date", "project_end_date"],
        )
    )

    overheads = _overheads_amount(application)
    overhead_ok = application.requested_amount > 0 and (overheads / application.requested_amount) <= cfg.overhead_cap_ratio
    checks.append(
        HardCheckResult(
            check_code="OVERHEAD_CAP",
            check_name="Overheads within cap",
            passed=overhead_ok,
            reason=(
                "Overheads are within cap."
                if overhead_ok
                else f"Overheads exceed {int(cfg.overhead_cap_ratio * 100)}% cap."
            ),
            evidence_fields=["overheads_amount", "budget_lines", "requested_amount"],
        )
    )

    budget_total = _budget_total(application)
    budget_ok = abs(budget_total - application.requested_amount) <= cfg.budget_tolerance
    checks.append(
        HardCheckResult(
            check_code="BUDGET_TOTAL_MATCH",
            check_name="Budget lines match requested total",
            passed=budget_ok,
            reason=(
                "Budget lines match requested amount within tolerance."
                if budget_ok
                else f"Budget lines total ({budget_total}) differs from requested amount ({application.requested_amount})."
            ),
            evidence_fields=["budget_lines", "requested_amount"],
        )
    )

    current_year = date.today().year
    if application.grant_type in (GrantType.cdg, GrantType.eig) and application.year_established is not None:
        required_years = 2 if application.grant_type == GrantType.cdg else 1
        age_ok = application.year_established <= current_year - required_years
        checks.append(
            HardCheckResult(
                check_code="ORG_AGE",
                check_name="Organisation minimum years of operation",
                passed=age_ok,
                reason=(
                    "Organisation meets minimum age requirement."
                    if age_ok
                    else f"Organisation must be established at least {required_years} year(s) ago."
                ),
                evidence_fields=["year_established"],
            )
        )

    if application.grant_type == GrantType.cdg:
        geo_ok = bool(application.project_location and application.project_location.is_rural_or_semi_urban)
        checks.append(
            HardCheckResult(
                check_code="GEOGRAPHY_FOCUS",
                check_name="Project location is rural/semi-urban",
                passed=geo_ok,
                reason=(
                    "Project location is within geographic focus."
                    if geo_ok
                    else "Project location must be rural or semi-urban for CDG."
                ),
                evidence_fields=["project_location"],
            )
        )

    if application.grant_type == GrantType.eig:
        schools_ok = (application.schools_targeted or 0) >= 5
        checks.append(
            HardCheckResult(
                check_code="SCHOOLS_MINIMUM",
                check_name="Minimum schools targeted",
                passed=schools_ok,
                reason=(
                    "Minimum schools requirement met."
                    if schools_ok
                    else "EIG requires at least 5 schools targeted."
                ),
                evidence_fields=["schools_targeted"],
            )
        )

        grades_ok = len(application.grade_levels) > 0
        checks.append(
            HardCheckResult(
                check_code="GRADE_COVERAGE",
                check_name="At least one grade level targeted",
                passed=grades_ok,
                reason=(
                    "Grade level coverage provided."
                    if grades_ok
                    else "At least one grade level must be selected."
                ),
                evidence_fields=["grade_levels"],
            )
        )

    return checks


def build_screening_advisory_flags(application: ApplicationData) -> list[SoftFlag]:
    flags: list[SoftFlag] = []

    if application.grant_type == GrantType.cdg:
        beneficiaries = application.beneficiary_count or 0
        if beneficiaries <= 0:
            flags.append(
                SoftFlag(
                    flag_code="BENEFICIARY_MISSING",
                    title="Beneficiary count missing or zero",
                    severity=SeverityLevel.medium,
                    message="Beneficiary count should be greater than zero for reasonableness check.",
                    field_refs=["beneficiary_count"],
                )
            )
        elif application.requested_amount / beneficiaries >= 50000:
            flags.append(
                SoftFlag(
                    flag_code="COST_PER_BENEFICIARY_HIGH",
                    title="High cost per beneficiary",
                    severity=SeverityLevel.medium,
                    message="Estimated cost per beneficiary exceeds INR 50,000.",
                    field_refs=["beneficiary_count", "requested_amount"],
                )
            )

    if application.grant_type == GrantType.ecag and application.project_location:
        if application.project_location.is_climate_priority is False:
            flags.append(
                SoftFlag(
                    flag_code="NON_PRIORITY_DISTRICT",
                    title="Non-priority geography",
                    severity=SeverityLevel.low,
                    message="Location is not marked as climate-vulnerable priority. Flag for officer review.",
                    field_refs=["project_location"],
                )
            )

    return flags
