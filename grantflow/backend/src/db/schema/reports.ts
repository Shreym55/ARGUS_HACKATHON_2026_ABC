import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  date,
} from 'drizzle-orm/pg-core';
import { reportStatus } from './enums';
import { grants } from './grants';

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  grantId: uuid('grant_id')
    .notNull()
    .references(() => grants.id, { onDelete: 'restrict' }),
  reportType: varchar('report_type', { length: 100 }).notNull(),
  status: reportStatus('status').notNull().default('draft'),
  dueDate: date('due_date'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
