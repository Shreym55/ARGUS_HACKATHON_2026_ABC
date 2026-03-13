import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
} from 'drizzle-orm/pg-core';
import { reports } from './reports';

export const reportFinancials = pgTable('report_financials', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 255 }).notNull(),
  budgetedAmount: numeric('budgeted_amount', { precision: 15, scale: 2 }).notNull(),
  spentAmount: numeric('spent_amount', { precision: 15, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ReportFinancial = typeof reportFinancials.$inferSelect;
export type NewReportFinancial = typeof reportFinancials.$inferInsert;
