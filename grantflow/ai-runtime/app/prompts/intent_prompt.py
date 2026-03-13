INTENT_PROMPT = """
Classify the intent of a user message in GrantFlow — a grant management platform for NGOs.

You receive context about the current session state:
  - user_msg: the user's latest message
  - has_grant_type: whether a grant type (cdg/eig/ecag) has been selected
  - has_current_field_key: whether the system is ACTIVELY collecting a specific form field
  - current_field_key: the active form field key, if any
  - current_field_question: the active form question text, if any
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
  Also includes pause/resume/cancel commands during application.
  Examples: "I want to apply", "start my application", "apply for CDG", "begin the form",
  "our organisation name is Sahara Foundation", "we serve 500 rural households",
  "2018" (answering year_established field), "ngo" (answering org type field),
  "stop application", "pause", "resume application"

out_of_scope
  Topics completely unrelated to GrantFlow or grants.
  Examples: "tell me a joke", "what is the weather?", "best movies of 2024",
  "how do I cook pasta?", "what is Bitcoin?", "who won the cricket match?"

CLASSIFICATION RULES (priority order)
──────────────────────────────────────
1. If user message is an explicit application control command
   ("stop", "pause", "resume", "cancel", "continue application", "resume application")
   → return "application".

2. If has_current_field_key is TRUE and user_msg is clearly asking a question,
   requesting explanation, or asking about grants/process (e.g. contains "?",
   starts with "what/how/why/can you/tell me/explain") → return "qna".

3. If has_current_field_key is TRUE and user_msg looks like a direct field answer
   (short factual response, number, date, email, organization info, demographics, etc.)
   → return "application".

4. If message contains application-start keywords: "apply", "start application", "fill form",
   "submit application", "begin application", "I want to apply", "apply for" → "application"

5. If message asks about grants, eligibility, funding, documents, or GrantFlow processes → "qna"

6. If message is only a greeting or social phrase → "greeting"

7. If topic is fully unrelated to grants or GrantFlow → "out_of_scope"

Return ONLY valid JSON — no markdown, no extra text:
{"intent": "<greeting|qna|application|out_of_scope>", "reason": "<one sentence>"}
"""
