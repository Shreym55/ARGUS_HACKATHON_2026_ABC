import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { applicationStatus } from './enums';
import { users } from './users';
import { organizations } from './organizations';
import { grantPrograms } from './grant-programs';

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  grantProgramId: uuid('grant_program_id')
    .notNull()
    .references(() => grantPrograms.id, { onDelete: 'restrict' }),
  applicantId: uuid('applicant_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  status: applicationStatus('status').notNull().default('draft'),
  applicationMode: varchar('application_mode', { length: 20 }).notNull().default('wizard'),
  currentStep: varchar('current_step', { length: 50 }).notNull().default('organisation'),
  workflowStage: varchar('workflow_stage', { length: 100 }),

  // ── Step 1: Organisation (pre-filled from profile) ───────────────────────
  // organisationId link above covers this; snapshot fields stored here
  orgNameSnapshot: varchar('org_name_snapshot', { length: 255 }),

  // ── Step 2: Project ───────────────────────────────────────────────────────
  projectTitle: varchar('project_title', { length: 255 }),
  problemStatement: text('problem_statement'),
  proposedSolution: text('proposed_solution'),
  expectedOutcomes: text('expected_outcomes'),
  projectLocation: varchar('project_location', { length: 255 }),
  projectDistrict: varchar('project_district', { length: 100 }),
  projectState: varchar('project_state', { length: 100 }),
  projectDurationMonths: integer('project_duration_months'),
  beneficiaryCount: integer('beneficiary_count'),
  beneficiaryDescription: text('beneficiary_description'),

  // ── Legacy / convenience ──────────────────────────────────────────────────
  projectDescription: text('project_description'),

  // ── Step 3: Team ──────────────────────────────────────────────────────────
  // [{name, designation, qualification, experienceYears}]
  teamMembers: jsonb('team_members'),

  // ── Step 4: Budget ────────────────────────────────────────────────────────
  // [{item, amount, justification}]
  budgetLines: jsonb('budget_lines'),
  requestedAmount: numeric('requested_amount', { precision: 15, scale: 2 }),
  totalBudgetAmount: numeric('total_budget_amount', { precision: 15, scale: 2 }),

  // ── Step 6: Declaration ───────────────────────────────────────────────────
  declarationAccepted: boolean('declaration_accepted').notNull().default(false),

  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
