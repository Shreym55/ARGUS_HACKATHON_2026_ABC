# GrantFlow

## AI Runtime

`ai-runtime` implements a single LangGraph orchestrator for:
- `screening` (eligibility + soft flags)
- `review_package` (summary + AI suggested scores + risks)
- `compliance` (content checks + financial checks + action recommendation)

Conversational applicant intake is provided as a separate guided service endpoint.

### Runtime Stack
- FastAPI
- LangGraph
- OpenAI (`gpt-4o-mini` default)

### Environment
See `ai-runtime/.env.example`.

### Local Run (Docker Compose)
```bash
docker compose up --build
```

Services:
- backend: `http://localhost:3001`
- frontend: `http://localhost:5174`
- ai-runtime: `http://localhost:8001`

### AI Endpoints
- `POST /api/v1/screening/analyze`
- `POST /api/v1/review/package`
- `POST /api/v1/compliance/analyze`
- `POST /api/v1/intake/next-question`
- `GET /health`

### LangGraph Flow
`load_payload -> route_task -> [task specific deterministic node -> task llm node -> task merge node] -> policy_guard -> format_output -> persist_artifacts`

### Important Policy
AI responses are advisory only. Final decisions remain with human roles (Program Officer, Reviewer, Finance Officer).
