ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "program_code" varchar(10);
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "purpose_summary" text;
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "eligibility_highlights" jsonb;
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "eligible_org_types" jsonb;
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "project_duration_min" integer;
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "project_duration_max" integer;
--> statement-breakpoint
ALTER TABLE "grant_programs" ADD COLUMN IF NOT EXISTS "application_deadline" date;
