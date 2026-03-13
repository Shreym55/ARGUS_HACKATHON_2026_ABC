#!/bin/bash

PROJECT="grantflow"

echo "Creating project: $PROJECT"

# Root
mkdir -p $PROJECT
cd $PROJECT

touch docker-compose.yml
touch .env.example
touch README.md

mkdir -p infrastructure
mkdir -p scripts

########################################
# FRONTEND (React)
########################################

mkdir -p frontend/src/{pages,components,layouts,services,hooks,routes,store}
mkdir -p frontend/src/pages/{grants,applicant,reviewer,finance,admin}
mkdir -p frontend/public

touch frontend/package.json
touch frontend/src/services/api.ts

########################################
# BACKEND (NestJS + Drizzle)
########################################

mkdir -p backend/src/modules/{auth,users,organisations,grants,applications,reviews,compliance,disbursements,notifications,admin}

mkdir -p backend/src/common/{guards,decorators,filters,middleware}

mkdir -p backend/src/database/schema

mkdir -p backend/src/services

mkdir -p backend/drizzle/{schema,migrations,seed}

touch backend/drizzle.config.ts
touch backend/package.json

touch backend/src/main.ts

touch backend/src/services/ai.service.ts
touch backend/src/services/pdf.service.ts
touch backend/src/services/notification.service.ts

########################################
# AI RUNTIME (FastAPI)
########################################

mkdir -p ai-runtime/app/{api,services,prompts,llm,schemas}

touch ai-runtime/app/api/screening.py
touch ai-runtime/app/api/review.py
touch ai-runtime/app/api/compliance.py

touch ai-runtime/app/services/eligibility_service.py
touch ai-runtime/app/services/review_service.py
touch ai-runtime/app/services/compliance_service.py

touch ai-runtime/app/prompts/screening_prompt.txt
touch ai-runtime/app/prompts/review_prompt.txt
touch ai-runtime/app/prompts/compliance_prompt.txt

touch ai-runtime/app/llm/client.py
touch ai-runtime/app/schemas/ai_models.py
touch ai-runtime/app/main.py

touch ai-runtime/requirements.txt
touch ai-runtime/Dockerfile

########################################
# SHARED DIRECTORIES
########################################

mkdir -p uploads
mkdir -p pdf_templates
mkdir -p notification_templates
mkdir -p tests

########################################

echo "GrantFlow project structure created successfully!"