import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  date,
} from 'drizzle-orm/pg-core';
import { disbursementStatus } from './enums';
import { grants } from './grants';

export const disbursements = pgTable('disbursements', {
  id: uuid('id').defaultRandom().primaryKey(),
  grantId: uuid('grant_id')
    .notNull()
    .references(() => grants.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: disbursementStatus('status').notNull().default('pending'),
  scheduledDate: date('scheduled_date'),
  disbursedAt: timestamp('disbursed_at'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Disbursement = typeof disbursements.$inferSelect;
export type NewDisbursement = typeof disbursements.$inferInsert;
