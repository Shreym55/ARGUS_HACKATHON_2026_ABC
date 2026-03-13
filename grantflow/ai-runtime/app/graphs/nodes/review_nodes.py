from __future__ import annotations

from app.data.program_config import get_program_config
from app.llm.client import llm_client
from app.prompts.review_prompt import REVIEW_PROMPT
from app.schemas.ai_models import (
    ApplicationData,
    GrantType,
    ReviewLLMOutput,
    RiskFlag,
    ScoreSuggestion,
    SeverityLevel,
)
from app.services.review_service import build_deterministic_risk_flags, compute_composite_ai_score


def review_deterministic_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["payload"]["application"])
    cfg = get_program_config(application.grant_type)
    deterministic_flags = build_deterministic_risk_flags(application)
    rubric = [{"dimension": dim.name, "weight": dim.weight} for dim in cfg.rubric]
    return {
        **state,
        "application_data": application.model_dump(mode="json"),
        "deterministic_result": {
            "risk_flags": [flag.model_dump(mode="json") for flag in deterministic_flags],
            "rubric": rubric,
        },
    }


def _review_fallback(application: ApplicationData, rubric: list[dict]) -> ReviewLLMOutput:
    summary = (
        f"{application.organisation_type} requests INR {application.requested_amount} for "
        f"'{application.project_title}'. Beneficiaries: {application.beneficiary_count or 'N/A'}. "
        f"Key activities: {', '.join(application.key_activities[:3]) if application.key_activities else 'Not provided'}."
    )
    suggestions: list[ScoreSuggestion] = []
    for item in rubric:
        suggestions.append(
            ScoreSuggestion(
                dimension=item["dimension"],
                weight=item["weight"],
                score=3,
                justification="Fallback score generated without LLM. Reviewer must validate.",
                evidence_refs=["project_description", "expected_outcomes", "budget_lines"],
                is_ai_suggested=True,
            )
        )

    flags = []
    if not application.team_size:
        flags.append(
            RiskFlag(
                category="team_capacity_risk",
                severity=SeverityLevel.medium,
                message="Team size not provided; capacity assessment uncertain.",
                evidence_refs=["team_size"],
            )
        )

    return ReviewLLMOutput(
        application_summary=summary,
        key_highlights=[
            "Fallback mode used because LLM is unavailable.",
            "All suggested scores require human reviewer confirmation.",
        ],
        score_suggestions=suggestions,
        risk_flags=flags,
    )


def review_llm_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["application_data"])
    rubric = state["deterministic_result"]["rubric"]

    if llm_client.enabled:
        llm_result = llm_client.invoke_structured(
            ReviewLLMOutput,
            REVIEW_PROMPT,
            {
                "grant_type": application.grant_type.value,
                "rubric": rubric,
                "required_risk_categories": [
                    "budget_anomaly",
                    "timeline_risk",
                    "vague_outcomes",
                    "team_capacity_risk",
                    "prior_grant_history_risk",
                ],
                "application": application.model_dump(mode="json"),
            },
        )
    else:
        llm_result = _review_fallback(application, rubric)

    return {**state, "llm_result": llm_result.model_dump(mode="json")}


def review_merge_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["application_data"])
    llm_result = ReviewLLMOutput.model_validate(state["llm_result"])
    deterministic_flags = [
        RiskFlag.model_validate(flag) for flag in state["deterministic_result"]["risk_flags"]
    ]

    dedupe: dict[tuple[str, str], RiskFlag] = {}
    for flag in deterministic_flags + llm_result.risk_flags:
        dedupe[(flag.category, flag.message)] = flag
    all_flags = list(dedupe.values())

    composite_score = compute_composite_ai_score(application.grant_type, llm_result.score_suggestions)

    return {
        **state,
        "merged_result": {
            "application_id": application.application_id,
            "grant_type": application.grant_type.value,
            "application_summary": llm_result.application_summary,
            "score_suggestions": [score.model_dump(mode="json") for score in llm_result.score_suggestions],
            "risk_flags": [flag.model_dump(mode="json") for flag in all_flags],
            "composite_ai_score": composite_score,
            "reviewer_notice": "",
        }
    }
