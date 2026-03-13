import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { reviews } from './reviews';

export const reviewScores = pgTable('review_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 255 }).notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ReviewScore = typeof reviewScores.$inferSelect;
export type NewReviewScore = typeof reviewScores.$inferInsert;
