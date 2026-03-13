from __future__ import annotations

from app.schemas.ai_models import (
    ComplianceAction,
    CompliancePayload,
    FinancialFlag,
    SeverityLevel,
)


def run_financial_checks(payload: CompliancePayload) -> list[FinancialFlag]:
    report = payload.report
    baseline = payload.approved_baseline
    flags: list[FinancialFlag] = []

    period_total = report.total_expenditure_period
    cumulative_total = report.cumulative_expenditure_to_date
    line_period_sum = sum(line.spent_period for line in report.expenditure_by_line)
    line_cumulative_sum = sum(line.cumulative_spent for line in report.expenditure_by_line)

    if period_total is not None and abs(period_total - line_period_sum) > 1:
        flags.append(
            FinancialFlag(
                flag_code="PERIOD_TOTAL_MISMATCH",
                severity=SeverityLevel.high,
                message=(
                    f"Reported period expenditure ({period_total}) does not match line-item sum "
                    f"({line_period_sum})."
                ),
                field_refs=["total_expenditure_period", "expenditure_by_line"],
            )
        )

    if cumulative_total is not None and abs(cumulative_total - line_cumulative_sum) > 1:
        flags.append(
            FinancialFlag(
                flag_code="CUMULATIVE_TOTAL_MISMATCH",
                severity=SeverityLevel.high,
                message=(
                    f"Reported cumulative expenditure ({cumulative_total}) does not match line-item sum "
                    f"({line_cumulative_sum})."
                ),
                field_refs=["cumulative_expenditure_to_date", "expenditure_by_line"],
            )
        )

    for idx, line in enumerate(report.expenditure_by_line):
        if line.approved_budget <= 0:
            continue
        deviation_ratio = abs(line.cumulative_spent - line.approved_budget) / line.approved_budget
        if deviation_ratio > 0.10:
            has_explanation = bool(line.variance_explanation and line.variance_explanation.strip())
            flags.append(
                FinancialFlag(
                    flag_code=f"BUDGET_VARIANCE_{idx+1}",
                    severity=SeverityLevel.medium if has_explanation else SeverityLevel.high,
                    message=(
                        f"Line '{line.category}' deviates by more than 10% from approved budget."
                        + (" Variance explanation provided." if has_explanation else " Missing variance explanation.")
                    ),
                    field_refs=[f"expenditure_by_line[{idx}]"],
                )
            )

    progress = payload.timeline_progress_ratio
    if (
        progress is not None
        and progress >= 0.5
        and cumulative_total is not None
        and baseline.approved_budget_total > 0
        and cumulative_total < 0.3 * baseline.approved_budget_total
    ):
        flags.append(
            FinancialFlag(
                flag_code="UNDERSPEND_ALERT",
                severity=SeverityLevel.medium,
                message="Cumulative spend is below 30% at 50% or more project timeline progress.",
                field_refs=["timeline_progress_ratio", "cumulative_expenditure_to_date"],
            )
        )

    return flags


def escalate_action_for_financial_flags(
    existing_action: ComplianceAction,
    flags: list[FinancialFlag],
) -> ComplianceAction:
    has_high = any(flag.severity == SeverityLevel.high for flag in flags)
    if has_high:
        return ComplianceAction.flag_compliance_action
    if existing_action == ComplianceAction.approve_report and flags:
        return ComplianceAction.request_clarification
    return existing_action
