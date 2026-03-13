from __future__ import annotations

from dataclasses import dataclass

from app.schemas.ai_models import GrantType


@dataclass(frozen=True)
class RubricDimension:
    name: str
    weight: int


@dataclass(frozen=True)
class ProgramConfig:
    thematic_threshold: int
    overhead_cap_ratio: float
    budget_tolerance: float
    min_duration_months: int
    max_duration_months: int
    min_amount: float
    max_amount: float
    allowed_org_types: tuple[str, ...]
    rubric: tuple[RubricDimension, ...]


PROGRAM_CONFIGS: dict[GrantType, ProgramConfig] = {
    GrantType.cdg: ProgramConfig(
        thematic_threshold=60,
        overhead_cap_ratio=0.15,
        budget_tolerance=500.0,
        min_duration_months=6,
        max_duration_months=18,
        min_amount=200000.0,
        max_amount=2000000.0,
        allowed_org_types=("ngo", "trust", "section 8 company"),
        rubric=(
            RubricDimension("Community Need & Problem Clarity", 25),
            RubricDimension("Project Design & Feasibility", 25),
            RubricDimension("Organisation Track Record", 20),
            RubricDimension("Expected Impact & Outcomes", 20),
            RubricDimension("Budget Realism", 10),
        ),
    ),
    GrantType.eig: ProgramConfig(
        thematic_threshold=65,
        overhead_cap_ratio=0.15,
        budget_tolerance=500.0,
        min_duration_months=12,
        max_duration_months=24,
        min_amount=500000.0,
        max_amount=5000000.0,
        allowed_org_types=(
            "ngo",
            "edtech non-profit",
            "research institution",
            "university",
        ),
        rubric=(
            RubricDimension("Innovation & Novelty", 25),
            RubricDimension("Educational Impact Potential", 25),
            RubricDimension("Team & Organisational Capacity", 20),
            RubricDimension("Scalability & Sustainability", 15),
            RubricDimension("Budget Efficiency", 15),
        ),
    ),
    GrantType.ecag: ProgramConfig(
        thematic_threshold=60,
        overhead_cap_ratio=0.15,
        budget_tolerance=500.0,
        min_duration_months=6,
        max_duration_months=24,
        min_amount=300000.0,
        max_amount=3000000.0,
        allowed_org_types=("ngo", "fpo", "panchayat", "research institution"),
        rubric=(
            RubricDimension("Environmental Impact & Urgency", 30),
            RubricDimension("Community Ownership & Inclusion", 25),
            RubricDimension("Technical Soundness", 20),
            RubricDimension("Organisation & Team Capacity", 15),
            RubricDimension("Budget Realism & Sustainability", 10),
        ),
    ),
}


def get_program_config(grant_type: GrantType) -> ProgramConfig:
    return PROGRAM_CONFIGS[grant_type]
