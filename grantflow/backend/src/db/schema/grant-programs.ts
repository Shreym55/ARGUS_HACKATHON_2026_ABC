import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  numeric,
  date,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { grantTypes } from './enums';
import { users } from './users';

export const grantPrograms = pgTable('grant_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  programCode: varchar('program_code', { length: 10 }),  // CDG | EIG | ECAG
  description: text('description'),
  purposeSummary: text('purpose_summary'),
  grantType: grantTypes('grant_type').notNull(),
  totalBudget: numeric('total_budget', { precision: 15, scale: 2 }).notNull(),
  availableBudget: numeric('available_budget', { precision: 15, scale: 2 }).notNull(),
  minAmount: numeric('min_amount', { precision: 15, scale: 2 }),
  maxAmount: numeric('max_amount', { precision: 15, scale: 2 }),
  projectDurationMin: integer('project_duration_min'),   // months
  projectDurationMax: integer('project_duration_max'),   // months
  applicationDeadline: date('application_deadline'),
  eligibilityHighlights: jsonb('eligibility_highlights'), // string[]
  eligibleOrgTypes: jsonb('eligible_org_types'),          // string[]
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type GrantProgram = typeof grantPrograms.$inferSelect;
export type NewGrantProgram = typeof grantPrograms.$inferInsert;
