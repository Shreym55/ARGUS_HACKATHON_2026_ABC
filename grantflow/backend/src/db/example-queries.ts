/**
 * Example Drizzle ORM query patterns for NestJS services.
 *
 * Inject the DB using:
 *   constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}
 */

import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from './drizzle.provider';
import { DrizzleDB } from './client';
import {
  users,
  applications,
  grants,
  disbursements,
  notifications,
  auditLogs,
  applicationStatus,
} from './schema';

@Injectable()
export class ExampleQueriesService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  // ─── SELECT ───────────────────────────────────────────────────────────────

  /** Find a user by email */
  async findUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
      with: { organization: true },
    });
  }

  /** List all submitted applications with applicant info */
  async listSubmittedApplications() {
    return this.db.query.applications.findMany({
      where: eq(applications.status, 'submitted'),
      with: {
        applicant: true,
        grantProgram: true,
        organization: true,
      },
      orderBy: [desc(applications.submittedAt)],
    });
  }

  /** Get a single application with all relations */
  async getApplicationById(id: string) {
    return this.db.query.applications.findFirst({
      where: eq(applications.id, id),
      with: {
        applicant: true,
        grantProgram: true,
        organization: true,
        documents: true,
        eligibilityChecks: true,
        reviews: { with: { scores: true } },
        grant: { with: { disbursements: true } },
      },
    });
  }

  // ─── INSERT ───────────────────────────────────────────────────────────────

  /** Create a new user */
  async createUser(data: typeof users.$inferInsert) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  /** Submit an application (status transition) */
  async submitApplication(applicationId: string) {
    const [updated] = await this.db
      .update(applications)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.status, 'draft'),
        ),
      )
      .returning();
    return updated;
  }

  // ─── TRANSACTION ──────────────────────────────────────────────────────────

  /** Approve an application and create a grant atomically */
  async approveApplicationAndCreateGrant(
    applicationId: string,
    approvedBy: string,
    approvedAmount: string,
    grantNumber: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [updatedApp] = await tx
        .update(applications)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(applications.id, applicationId))
        .returning();

      const [grant] = await tx
        .insert(grants)
        .values({
          applicationId,
          grantNumber,
          approvedAmount,
          approvedBy,
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId: approvedBy,
        action: 'APPROVE',
        entityType: 'application',
        entityId: applicationId,
        newValue: { status: 'approved', grantId: grant.id },
      });

      return { application: updatedApp, grant };
    });
  }

  // ─── AGGREGATE ────────────────────────────────────────────────────────────

  /** Count applications grouped by status */
  async countApplicationsByStatus() {
    return this.db
      .select({
        status: applications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(applications)
      .groupBy(applications.status);
  }

  // ─── NOTIFICATION ─────────────────────────────────────────────────────────

  /** Send a notification to a user */
  async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    referenceId?: string,
    referenceType?: string,
  ) {
    const [notification] = await this.db
      .insert(notifications)
      .values({ userId, type, title, body, referenceId, referenceType })
      .returning();
    return notification;
  }
}
