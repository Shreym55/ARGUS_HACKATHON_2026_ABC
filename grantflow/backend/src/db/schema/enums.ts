import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoles = pgEnum('user_roles', [
  'admin',
  'applicant',
  'reviewer',
  'program_manager',
]);

export const grantTypes = pgEnum('grant_types', [
  'federal',
  'state',
  'private',
  'foundation',
  'corporate',
]);

export const applicationStatus = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revision_requested',
]);

export const reviewStatus = pgEnum('review_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const reportStatus = pgEnum('report_status', [
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

export const disbursementStatus = pgEnum('disbursement_status', [
  'pending',
  'processing',
  'disbursed',
  'failed',
  'cancelled',
]);
