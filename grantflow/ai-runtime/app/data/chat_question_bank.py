from __future__ import annotations

from app.schemas.ai_models import GrantType


COMMON_BASE_FIELDS: list[dict] = [
    {"key": "organisation_legal_name", "question": "What is the legal name of your organisation?", "type": "text"},
    {"key": "registration_number", "question": "What is your registration number?", "type": "text"},
    {"key": "organisation_type", "question": "What is your organisation type?", "type": "text"},
    {"key": "year_established", "question": "What year was your organisation established?", "type": "int"},
    {"key": "contact_person_name", "question": "Who is the primary contact person?", "type": "text"},
    {"key": "contact_email", "question": "What is the primary contact email?", "type": "email"},
    {"key": "contact_phone", "question": "What is the primary contact phone number?", "type": "text"},
    {"key": "project_title", "question": "What is the project title?", "type": "text"},
    {"key": "problem_statement", "question": "Describe the problem your project is solving.", "type": "text"},
    {"key": "proposed_solution", "question": "Describe your proposed solution.", "type": "text"},
    {"key": "project_start_date", "question": "What is the project start date? (YYYY-MM-DD)", "type": "date"},
    {"key": "project_end_date", "question": "What is the project end date? (YYYY-MM-DD)", "type": "date"},
    {"key": "requested_amount", "question": "How much funding are you requesting (INR)?", "type": "float"},
    {"key": "overheads_amount", "question": "What is the overhead amount (INR)?", "type": "float"},
    {"key": "budget_justification", "question": "Provide a brief budget justification.", "type": "text"},
]


CDG_FIELDS: list[dict] = COMMON_BASE_FIELDS + [
    {"key": "project_location", "question": "What is the project location (District, State)?", "type": "text"},
    {"key": "beneficiary_count", "question": "How many beneficiaries will be reached?", "type": "int"},
    {"key": "beneficiary_demographics", "question": "Describe beneficiary demographics.", "type": "text"},
    {"key": "expected_outcomes", "question": "What are the expected outcomes?", "type": "text"},
]

EIG_FIELDS: list[dict] = COMMON_BASE_FIELDS + [
    {"key": "innovation_type", "question": "What is the innovation type?", "type": "text"},
    {"key": "schools_targeted", "question": "How many schools are targeted?", "type": "int"},
    {"key": "students_targeted", "question": "How many students are expected to benefit?", "type": "int"},
    {"key": "grade_levels", "question": "Which grade levels are targeted?", "type": "text"},
    {"key": "measurement_plan", "question": "Describe your impact measurement plan.", "type": "text"},
]

ECAG_FIELDS: list[dict] = COMMON_BASE_FIELDS + [
    {"key": "thematic_area", "question": "What is the environmental/climate thematic area?", "type": "text"},
    {"key": "climate_vulnerability_context", "question": "Describe climate vulnerability context.", "type": "text"},
    {"key": "community_involvement_plan", "question": "How is the community involved?", "type": "text"},
    {"key": "environmental_indicators", "question": "List 3-5 measurable environmental indicators.", "type": "text"},
]


QUESTION_BANK: dict[GrantType, list[dict]] = {
    GrantType.cdg: CDG_FIELDS,
    GrantType.eig: EIG_FIELDS,
    GrantType.ecag: ECAG_FIELDS,
}
