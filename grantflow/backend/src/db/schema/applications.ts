import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
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
  requestedAmount: numeric('requested_amount', { precision: 15, scale: 2 }).notNull(),
  projectTitle: varchar('project_title', { length: 255 }).notNull(),
  projectDescription: text('project_description'),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
