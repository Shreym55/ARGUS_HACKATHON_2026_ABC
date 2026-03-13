import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  numeric,
  date,
} from 'drizzle-orm/pg-core';
import { grantTypes } from './enums';
import { users } from './users';

export const grantPrograms = pgTable('grant_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  grantType: grantTypes('grant_type').notNull(),
  totalBudget: numeric('total_budget', { precision: 15, scale: 2 }).notNull(),
  availableBudget: numeric('available_budget', { precision: 15, scale: 2 }).notNull(),
  minAmount: numeric('min_amount', { precision: 15, scale: 2 }),
  maxAmount: numeric('max_amount', { precision: 15, scale: 2 }),
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
