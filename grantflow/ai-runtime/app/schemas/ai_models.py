from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, ConfigDict


class TaskType(str, Enum):
    screening = "screening"
    review_package = "review_package"
    compliance = "compliance"


class GrantType(str, Enum):
    cdg = "cdg"
    eig = "eig"
    ecag = "ecag"


class SeverityLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Recommendation(str, Enum):
    eligible = "eligible"
    ineligible = "ineligible"
    needs_human_review = "needs_human_review"


class ComplianceRating(str, Enum):
    satisfactory = "satisfactory"
    needs_clarification = "needs_clarification"
    concerns_found = "concerns_found"


class ComplianceAction(str, Enum):
    approve_report = "approve_report"
    request_clarification = "request_clarification"
    flag_compliance_action = "flag_compliance_action"


class ChatIntent(str, Enum):
    greeting = "greeting"
    out_of_scope = "out_of_scope"
    qna = "qna"
    application = "application"


class BudgetLine(BaseModel):
    category: str
    amount: float = 0.0


class ProjectLocation(BaseModel):
    district: str | None = None
    state: str | None = None
    is_rural_or_semi_urban: bool | None = None
    is_climate_priority: bool | None = None


class ApplicationData(BaseModel):
    model_config = ConfigDict(extra="allow")

    application_id: str | None = None
    grant_type: GrantType
    organisation_type: str
    year_established: int | None = None
    requested_amount: float
    project_title: str
    project_description: str | None = None
    problem_statement: str | None = None
    proposed_solution: str | None = None
    expected_outcomes: str | None = None
    beneficiary_demographics: str | None = None
    beneficiary_count: int | None = None
    schools_targeted: int | None = None
    grade_levels: list[str] = Field(default_factory=list)
    project_start_date: date | None = None
    project_end_date: date | None = None
    budget_lines: list[BudgetLine] = Field(default_factory=list)
    overheads_amount: float | None = None
    key_activities: list[str] = Field(default_factory=list)
    milestones: list[str] = Field(default_factory=list)
    team_size: int | None = None
    community_involvement_plan: str | None = None
    prior_grant_history: str | None = None
    prior_incomplete_projects_count: int | None = None
    project_location: ProjectLocation | None = None


class ReportFinancialLine(BaseModel):
    category: str
    approved_budget: float
    spent_period: float
    cumulative_spent: float
    variance_explanation: str | None = None


class ApprovedBaseline(BaseModel):
    planned_activities: list[str] = Field(default_factory=list)
    planned_outcomes: list[str] = Field(default_factory=list)
    approved_budget_total: float
    approved_budget_lines: list[BudgetLine] = Field(default_factory=list)
    start_date: date | None = None
    end_date: date | None = None


class ComplianceReportData(BaseModel):
    activities_completed: str
    activities_not_completed: str | None = None
    activities_next_period: str | None = None
    beneficiaries_cumulative: int | None = None
    outcome_progress: str
    challenges: str | None = None
    total_expenditure_period: float | None = None
    cumulative_expenditure_to_date: float | None = None
    expenditure_by_line: list[ReportFinancialLine] = Field(default_factory=list)
    support_needed_from_officer: str | None = None


class CompliancePayload(BaseModel):
    report_id: str | None = None
    grant_type: GrantType
    report_type: str
    timeline_progress_ratio: float | None = None
    approved_baseline: ApprovedBaseline
    report: ComplianceReportData


class ScreeningRequest(BaseModel):
    run_id: str | None = None
    application: ApplicationData


class ReviewRequest(BaseModel):
    run_id: str | None = None
    application: ApplicationData


class ComplianceRequest(BaseModel):
    run_id: str | None = None
    payload: CompliancePayload


class HardCheckResult(BaseModel):
    check_code: str
    check_name: str
    passed: bool
    reason: str
    evidence_fields: list[str] = Field(default_factory=list)


class SoftFlag(BaseModel):
    flag_code: str
    title: str
    severity: SeverityLevel
    message: str
    field_refs: list[str] = Field(default_factory=list)


class ScreeningLLMOutput(BaseModel):
    thematic_alignment_score: int = Field(ge=0, le=100)
    thematic_alignment_reason: str
    narrative_quality_score: int = Field(ge=0, le=100)
    measurable_outcome_present: bool
    narrative_findings: list[str] = Field(default_factory=list)
    soft_flags: list[SoftFlag] = Field(default_factory=list)


class ScreeningResult(BaseModel):
    task_type: TaskType = TaskType.screening
    run_id: str
    generated_at: datetime
    model: str
    application_id: str | None = None
    grant_type: GrantType
    overall_recommendation: Recommendation
    hard_checks: list[HardCheckResult] = Field(default_factory=list)
    soft_flags: list[SoftFlag] = Field(default_factory=list)
    summary: str


class ScoreSuggestion(BaseModel):
    dimension: str
    weight: int = Field(ge=0, le=100)
    score: int = Field(ge=1, le=5)
    justification: str
    evidence_refs: list[str] = Field(default_factory=list)
    is_ai_suggested: bool = True


class RiskFlag(BaseModel):
    category: str
    severity: SeverityLevel
    message: str
    evidence_refs: list[str] = Field(default_factory=list)
    source: str = "llm"


class ReviewLLMOutput(BaseModel):
    application_summary: str
    key_highlights: list[str] = Field(default_factory=list)
    score_suggestions: list[ScoreSuggestion] = Field(default_factory=list)
    risk_flags: list[RiskFlag] = Field(default_factory=list)


class ReviewPackageResult(BaseModel):
    task_type: TaskType = TaskType.review_package
    run_id: str
    generated_at: datetime
    model: str
    application_id: str | None = None
    grant_type: GrantType
    application_summary: str
    score_suggestions: list[ScoreSuggestion] = Field(default_factory=list)
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    composite_ai_score: float | None = None
    reviewer_notice: str


class FinancialFlag(BaseModel):
    flag_code: str
    severity: SeverityLevel
    message: str
    field_refs: list[str] = Field(default_factory=list)


class ComplianceLLMOutput(BaseModel):
    content_quality_rating: ComplianceRating
    narrative_assessment: str
    content_flags: list[SoftFlag] = Field(default_factory=list)
    recommended_action: ComplianceAction


class ComplianceResult(BaseModel):
    task_type: TaskType = TaskType.compliance
    run_id: str
    generated_at: datetime
    model: str
    report_id: str | None = None
    grant_type: GrantType
    content_quality_rating: ComplianceRating
    financial_flags: list[FinancialFlag] = Field(default_factory=list)
    content_flags: list[SoftFlag] = Field(default_factory=list)
    recommended_action: ComplianceAction
    summary: str


class GraphExecutionResult(BaseModel):
    run_id: str
    task_type: TaskType
    result: dict[str, Any]


class IntakeChatRequest(BaseModel):
    session_id: str
    message: str
    grant_type: GrantType | None = None
    collected_fields: dict[str, Any] = Field(default_factory=dict)
    current_field_key: str | None = None


class IntakeChatResponse(BaseModel):
    session_id: str
    intent: ChatIntent
    grant_type: GrantType | None = None
    reply: str
    collected_fields: dict[str, Any] = Field(default_factory=dict)
    current_field_key: str | None = None
    next_question: str | None = None
    validation_error: str | None = None
    is_complete: bool = False
    is_submitted: bool = False
    application_id: str | None = None
    screening_result: dict[str, Any] | None = None


class IntentClassificationLLMOutput(BaseModel):
    intent: ChatIntent
    reason: str


class QnaLLMOutput(BaseModel):
    answer: str


class FieldExtractionLLMOutput(BaseModel):
    extracted: str | int | float | None = None
    confidence: str = "low"
