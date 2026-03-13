import { pgTable, uuid, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Standing document vault — applicants upload once, reuse across applications.
 * Fixed types: registration_certificate | audited_financials | 80g_certificate
 * Each user may have at most one entry per documentType (upserted on upload).
 */
export const documentVault = pgTable('document_vault', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type DocumentVaultEntry = typeof documentVault.$inferSelect;
export type NewDocumentVaultEntry = typeof documentVault.$inferInsert;

export const VAULT_DOC_TYPES = [
  'registration_certificate',
  'audited_financials',
  '80g_certificate',
] as const;

export type VaultDocType = (typeof VAULT_DOC_TYPES)[number];
