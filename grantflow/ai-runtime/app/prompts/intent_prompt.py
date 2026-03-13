INTENT_PROMPT = """
Classify the intent of a user message in GrantFlow — a grant management platform for NGOs.

You receive context about the current session state:
  - message: the user's latest message
  - has_grant_type: whether a grant type (cdg/eig/ecag) has been selected
  - has_current_field_key: whether the system is ACTIVELY collecting a specific form field
  - grant_type: the selected grant type (if any)
  - fields_collected_count: how many application form fields have been collected so far

INTENT DEFINITIONS
──────────────────
greeting
  Casual social messages with no information request.
  Examples: "hi", "hello", "good morning", "hey there", "thanks", "bye", "how are you"

qna
  Questions or information requests about grants, eligibility, funding amounts, duration,
  documents required, application process, review timelines, how GrantFlow works, differences
  between CDG/EIG/ECAG, overhead caps, organisation type requirements, compliance reporting.
  Examples: "what grants do you have?", "am I eligible for CDG?", "how much can I apply for?",
  "what documents do I need?", "what is the overhead cap?", "what is EIG?",
  "how long does the review take?", "when is the deadline?"

application
  User explicitly wants to apply for a grant, start the intake form, or is providing
  an answer to an active form question during an ongoing application session.
  Examples: "I want to apply", "start my application", "apply for CDG", "begin the form",
  "our organisation name is Sahara Foundation", "we serve 500 rural households",
  "2018" (answering year_established field), "ngo" (answering org type field)

out_of_scope
  Topics completely unrelated to GrantFlow or grants.
  Examples: "tell me a joke", "what is the weather?", "best movies of 2024",
  "how do I cook pasta?", "what is Bitcoin?", "who won the cricket match?"

CLASSIFICATION RULES (priority order)
──────────────────────────────────────
1. If has_current_field_key is TRUE → ALWAYS return "application".
   The user is answering an active form question, regardless of how it is phrased.

2. If message contains application-start keywords: "apply", "start application", "fill form",
   "submit application", "begin application", "I want to apply", "apply for" → "application"

3. If message asks about grants, eligibility, funding, documents, or GrantFlow processes → "qna"

4. If message is only a greeting or social phrase → "greeting"

5. If topic is fully unrelated to grants or GrantFlow → "out_of_scope"

Return ONLY valid JSON — no markdown, no extra text:
{"intent": "<greeting|qna|application|out_of_scope>", "reason": "<one sentence>"}
"""
