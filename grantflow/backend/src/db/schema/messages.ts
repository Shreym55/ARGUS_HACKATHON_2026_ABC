import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { applications } from './applications';

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  applicationId: uuid('application_id').references(() => applications.id, {
    onDelete: 'set null',
  }),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
