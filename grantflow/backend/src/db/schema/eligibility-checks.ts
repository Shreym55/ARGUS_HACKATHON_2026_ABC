import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
} from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { users } from './users';

export const eligibilityChecks = pgTable('eligibility_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  checkName: varchar('check_name', { length: 255 }).notNull(),
  isEligible: boolean('is_eligible').notNull(),
  notes: text('notes'),
  checkedBy: uuid('checked_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type NewEligibilityCheck = typeof eligibilityChecks.$inferInsert;
