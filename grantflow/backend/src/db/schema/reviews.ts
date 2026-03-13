import {
  pgTable,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { reviewStatus } from './enums';
import { applications } from './applications';
import { reviewers } from './reviewers';

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id')
    .notNull()
    .references(() => reviewers.id, { onDelete: 'restrict' }),
  status: reviewStatus('status').notNull().default('pending'),
  recommendation: text('recommendation'),
  feedback: text('feedback'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
