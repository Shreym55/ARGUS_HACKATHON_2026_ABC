import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  date,
} from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { users } from './users';

export const grants = pgTable('grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: 'restrict' }),
  grantNumber: varchar('grant_number', { length: 100 }).notNull().unique(),
  approvedAmount: numeric('approved_amount', { precision: 15, scale: 2 }).notNull(),
  approvedAt: timestamp('approved_at').defaultNow().notNull(),
  approvedBy: uuid('approved_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  terms: text('terms'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Grant = typeof grants.$inferSelect;
export type NewGrant = typeof grants.$inferInsert;
