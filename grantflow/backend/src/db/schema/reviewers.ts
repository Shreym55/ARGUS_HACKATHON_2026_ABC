import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { grantPrograms } from './grant-programs';

export const reviewers = pgTable(
  'reviewers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantProgramId: uuid('grant_program_id')
      .notNull()
      .references(() => grantPrograms.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => ({
    uniqUserProgram: unique().on(t.userId, t.grantProgramId),
  }),
);

export type Reviewer = typeof reviewers.$inferSelect;
export type NewReviewer = typeof reviewers.$inferInsert;
