from __future__ import annotations

from app.data.program_config import get_program_config
from app.llm.client import llm_client
from app.prompts.screening_prompt import SCREENING_PROMPT
from app.schemas.ai_models import (
    ApplicationData,
    GrantType,
    Recommendation,
    ScreeningLLMOutput,
    SoftFlag,
    SeverityLevel,
)
from app.services.eligibility_service import build_screening_advisory_flags, run_hard_checks


def screening_deterministic_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["payload"]["application"])
    hard_checks = run_hard_checks(application)
    advisory_flags = build_screening_advisory_flags(application)
    return {
        **state,
        "application_data": application.model_dump(mode="json"),
        "deterministic_result": {
            "hard_checks": [check.model_dump(mode="json") for check in hard_checks],
            "advisory_flags": [flag.model_dump(mode="json") for flag in advisory_flags],
        },
    }


def _screening_fallback(application: ApplicationData, threshold: int) -> ScreeningLLMOutput:
    combined_text = " ".join(
        [
            application.project_title or "",
            application.problem_statement or "",
            application.proposed_solution or "",
            application.expected_outcomes or "",
        ]
    ).lower()

    keyword_map = {
        GrantType.cdg: ("community", "rural", "infrastructure", "livelihood"),
        GrantType.eig: ("learning", "school", "education", "student"),
        GrantType.ecag: ("climate", "environment", "resilience", "conservation"),
    }
    grant_type = application.grant_type
    hits = sum(1 for keyword in keyword_map[grant_type] if keyword in combined_text)
    thematic_score = min(100, 35 + hits * 15)
    narrative_score = 70 if len(combined_text) > 300 else 50
    measurable = any(char.isdigit() for char in (application.expected_outcomes or ""))
    flags: list[SoftFlag] = []
    if thematic_score < threshold:
        flags.append(
            SoftFlag(
                flag_code="THEMATIC_ALIGNMENT_LOW",
                title="Low thematic alignment",
                severity=SeverityLevel.medium,
                message="Project narrative appears weakly aligned to programme theme.",
                field_refs=["project_title", "problem_statement", "proposed_solution"],
            )
        )
    if not measurable:
        flags.append(
            SoftFlag(
                flag_code="OUTCOME_INDICATOR_MISSING",
                title="No measurable outcome indicator",
                severity=SeverityLevel.medium,
                message="Expected outcomes do not appear to include measurable indicators.",
                field_refs=["expected_outcomes"],
            )
        )
    return ScreeningLLMOutput(
        thematic_alignment_score=thematic_score,
        thematic_alignment_reason="Fallback heuristic used because LLM is unavailable.",
        narrative_quality_score=narrative_score,
        measurable_outcome_present=measurable,
        narrative_findings=[
            "Fallback narrative assessment generated without model inference."
        ],
        soft_flags=flags,
    )


def screening_llm_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["application_data"])
    cfg = get_program_config(application.grant_type)

    if llm_client.enabled:
        llm_result = llm_client.invoke_structured(
            ScreeningLLMOutput,
            SCREENING_PROMPT,
            {
                "grant_type": application.grant_type.value,
                "thematic_threshold": cfg.thematic_threshold,
                "application": application.model_dump(mode="json"),
            },
        )
    else:
        llm_result = _screening_fallback(application, cfg.thematic_threshold)

    return {**state, "llm_result": llm_result.model_dump(mode="json")}


def screening_merge_node(state: dict) -> dict:
    application = ApplicationData.model_validate(state["application_data"])
    llm_result = ScreeningLLMOutput.model_validate(state["llm_result"])
    hard_checks = state["deterministic_result"]["hard_checks"]
    advisory_flags = [
        SoftFlag.model_validate(flag) for flag in state["deterministic_result"]["advisory_flags"]
    ]

    failed_hard_checks = [check for check in hard_checks if not check["passed"]]
    soft_flags = advisory_flags + llm_result.soft_flags

    if failed_hard_checks:
        recommendation = Recommendation.ineligible
    elif soft_flags:
        recommendation = Recommendation.needs_human_review
    else:
        recommendation = Recommendation.eligible

    summary = (
        f"Hard checks passed: {len(hard_checks) - len(failed_hard_checks)}/{len(hard_checks)}. "
        f"Thematic alignment score: {llm_result.thematic_alignment_score}. "
        f"Narrative quality score: {llm_result.narrative_quality_score}."
    )

    return {
        **state,
        "merged_result": {
            "application_id": application.application_id,
            "grant_type": application.grant_type.value,
            "overall_recommendation": recommendation.value,
            "hard_checks": hard_checks,
            "soft_flags": [flag.model_dump(mode="json") for flag in soft_flags],
            "summary": summary,
        }
    }
