ALTER TABLE "applications" ALTER COLUMN "requested_amount" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "project_title" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_mode" varchar(20) NOT NULL DEFAULT 'wizard';
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "current_step" varchar(50) NOT NULL DEFAULT 'organisation';
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "workflow_stage" varchar(100);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "org_name_snapshot" varchar(255);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "problem_statement" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "proposed_solution" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "expected_outcomes" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "project_location" varchar(255);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "project_district" varchar(100);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "project_state" varchar(100);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "project_duration_months" integer;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "beneficiary_count" integer;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "beneficiary_description" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "team_members" jsonb;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "budget_lines" jsonb;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "total_budget_amount" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "declaration_accepted" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_vault" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "document_type" varchar(50) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "file_size" integer,
  "mime_type" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "document_vault"
    ADD CONSTRAINT "document_vault_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
