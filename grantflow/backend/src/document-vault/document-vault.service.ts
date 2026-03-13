import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { documentVault } from '../db/schema';

@Injectable()
export class DocumentVaultService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async listDocuments(userId: string) {
    return this.db
      .select()
      .from(documentVault)
      .where(eq(documentVault.userId, userId))
      .orderBy(documentVault.documentType);
  }

  /**
   * Upsert a vault document — one entry per (userId, documentType).
   * filePath is the server-side path returned from Multer.
   */
  async upsertDocument(
    userId: string,
    documentType: string,
    fileName: string,
    filePath: string,
    fileSize: number | null,
    mimeType: string | null,
  ) {
    const now = new Date();

    // Check if entry already exists
    const [existing] = await this.db
      .select({ id: documentVault.id })
      .from(documentVault)
      .where(
        and(
          eq(documentVault.userId, userId),
          eq(documentVault.documentType, documentType),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(documentVault)
        .set({ fileName, filePath, fileSize, mimeType, updatedAt: now })
        .where(eq(documentVault.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(documentVault)
      .values({ userId, documentType, fileName, filePath, fileSize, mimeType, createdAt: now, updatedAt: now })
      .returning();
    return created;
  }

  async deleteDocument(userId: string, documentId: string) {
    const [doc] = await this.db
      .select()
      .from(documentVault)
      .where(and(eq(documentVault.id, documentId), eq(documentVault.userId, userId)))
      .limit(1);

    if (!doc) throw new NotFoundException('Document not found.');

    await this.db.delete(documentVault).where(eq(documentVault.id, documentId));
    return { success: true };
  }
}
