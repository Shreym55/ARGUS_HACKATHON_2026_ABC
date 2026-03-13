from __future__ import annotations

from app.llm.client import llm_client
from app.llm.prompt_loader import load_prompt
from app.schemas.ai_models import (
    ComplianceAction,
    ComplianceLLMOutput,
    CompliancePayload,
    ComplianceRating,
    FinancialFlag,
    SeverityLevel,
    SoftFlag,
)
from app.services.compliance_service import escalate_action_for_financial_flags, run_financial_checks


def compliance_deterministic_node(state: dict) -> dict:
    payload = CompliancePayload.model_validate(state["payload"]["payload"])
    financial_flags = run_financial_checks(payload)
    return {
        "compliance_payload": payload.model_dump(mode="json"),
        "deterministic_result": {
            "financial_flags": [flag.model_dump(mode="json") for flag in financial_flags],
        },
    }


def _compliance_fallback(payload: CompliancePayload) -> ComplianceLLMOutput:
    report = payload.report
    text = " ".join(
        [
            report.activities_completed or "",
            report.outcome_progress or "",
            report.challenges or "",
        ]
    ).lower()

    rating = ComplianceRating.satisfactory if "challenge" in text else ComplianceRating.needs_clarification
    flags: list[SoftFlag] = []
    if "challenge" not in text:
        flags.append(
            SoftFlag(
                flag_code="BALANCE_SIGNAL_LOW",
                title="Limited acknowledgment of challenges",
                severity=SeverityLevel.low,
                message="Narrative appears overly positive and may need clarification.",
                field_refs=["challenges", "activities_not_completed"],
            )
        )

    action = (
        ComplianceAction.approve_report
        if rating == ComplianceRating.satisfactory
        else ComplianceAction.request_clarification
    )
    return ComplianceLLMOutput(
        content_quality_rating=rating,
        narrative_assessment="Fallback narrative analysis used because LLM is unavailable.",
        content_flags=flags,
        recommended_action=action,
    )


def compliance_llm_node(state: dict) -> dict:
    payload = CompliancePayload.model_validate(state["compliance_payload"])

    if llm_client.enabled:
        llm_result = llm_client.invoke_structured(
            ComplianceLLMOutput,
            load_prompt("compliance_prompt.txt"),
            {
                "grant_type": payload.grant_type.value,
                "report_type": payload.report_type,
                "timeline_progress_ratio": payload.timeline_progress_ratio,
                "approved_baseline": payload.approved_baseline.model_dump(mode="json"),
                "report": payload.report.model_dump(mode="json"),
            },
        )
    else:
        llm_result = _compliance_fallback(payload)

    return {"llm_result": llm_result.model_dump(mode="json")}


def compliance_merge_node(state: dict) -> dict:
    payload = CompliancePayload.model_validate(state["compliance_payload"])
    llm_result = ComplianceLLMOutput.model_validate(state["llm_result"])
    financial_flags = [
        FinancialFlag.model_validate(flag) for flag in state["deterministic_result"]["financial_flags"]
    ]

    final_action = escalate_action_for_financial_flags(llm_result.recommended_action, financial_flags)

    summary = (
        f"Content rating: {llm_result.content_quality_rating.value}. "
        f"Financial flags: {len(financial_flags)}. "
        f"Recommended action: {final_action.value}."
    )

    return {
        "merged_result": {
            "report_id": payload.report_id,
            "grant_type": payload.grant_type.value,
            "content_quality_rating": llm_result.content_quality_rating.value,
            "financial_flags": [flag.model_dump(mode="json") for flag in financial_flags],
            "content_flags": [flag.model_dump(mode="json") for flag in llm_result.content_flags],
            "recommended_action": final_action.value,
            "summary": summary,
        }
    }
