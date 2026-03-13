import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { users } from './users';

export const applicationDocuments = pgTable('application_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type NewApplicationDocument = typeof applicationDocuments.$inferInsert;
