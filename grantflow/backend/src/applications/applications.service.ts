import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import {
  applications,
  applicationDocuments,
  documentVault,
  grantPrograms,
  organizations,
  users,
} from '../db/schema';

export type CreateApplicationDto = {
  grantProgramId: string;
  applicationMode?: 'wizard' | 'chatbot';
};

export type UpdateApplicationDto = {
  // Step 1: Organisation (snapshot)
  orgNameSnapshot?: string;

  // Step 2: Project
  projectTitle?: string;
  problemStatement?: string;
  proposedSolution?: string;
  expectedOutcomes?: string;
  projectLocation?: string;
  projectDistrict?: string;
  projectState?: string;
  projectDurationMonths?: number;
  beneficiaryCount?: number;
  beneficiaryDescription?: string;

  // Step 3: Team — [{name, designation, qualification, experienceYears}]
  teamMembers?: Array<{
    name: string;
    designation: string;
    qualification: string;
    experienceYears: number;
  }>;

  // Step 4: Budget — [{item, amount, justification}]
  budgetLines?: Array<{ item: string; amount: number; justification: string }>;
  requestedAmount?: number;
  totalBudgetAmount?: number;

  // Step 6: Declaration
  declarationAccepted?: boolean;

  // Wizard tracking
  currentStep?: string;
};

const WORKFLOW_STAGES = ['submitted', 'screening', 'review', 'decision'] as const;

@Injectable()
export class ApplicationsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /** List all applications for the authenticated applicant */
  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        id: applications.id,
        status: applications.status,
        applicationMode: applications.applicationMode,
        currentStep: applications.currentStep,
        workflowStage: applications.workflowStage,
        projectTitle: applications.projectTitle,
        requestedAmount: applications.requestedAmount,
        submittedAt: applications.submittedAt,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        programmeName: grantPrograms.name,
        programmeCode: grantPrograms.programCode,
        orgName: organizations.name,
      })
      .from(applications)
      .leftJoin(grantPrograms, eq(applications.grantProgramId, grantPrograms.id))
      .leftJoin(organizations, eq(applications.organizationId, organizations.id))
      .where(eq(applications.applicantId, userId))
      .orderBy(desc(applications.updatedAt));

    return rows;
  }

  /** Get a single application (applicant must own it) */
  async findOne(userId: string, applicationId: string) {
    const [row] = await this.db
      .select()
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.applicantId, userId)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Application not found.');

    // Enrich with programme + org data
    const [programme] = await this.db
      .select()
      .from(grantPrograms)
      .where(eq(grantPrograms.id, row.grantProgramId))
      .limit(1);

    const org = row.organizationId
      ? (
          await this.db
            .select()
            .from(organizations)
            .where(eq(organizations.id, row.organizationId))
            .limit(1)
        )[0]
      : null;

    const docs = await this.db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId));

    return { ...row, programme, org, documents: docs };
  }

  /** Create a new draft application */
  async create(userId: string, dto: CreateApplicationDto) {
    // Verify grant programme exists
    const [programme] = await this.db
      .select({ id: grantPrograms.id })
      .from(grantPrograms)
      .where(and(eq(grantPrograms.id, dto.grantProgramId), eq(grantPrograms.isActive, true)))
      .limit(1);

    if (!programme) throw new NotFoundException('Grant programme not found.');

    // Get user's org
    const [user] = await this.db
      .select({ organizationId: users.organizationId, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const org = user?.organizationId
      ? (
          await this.db
            .select()
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1)
        )[0]
      : null;

    const now = new Date();
    const [created] = await this.db
      .insert(applications)
      .values({
        grantProgramId: dto.grantProgramId,
        applicantId: userId,
        organizationId: user?.organizationId ?? null,
        status: 'draft',
        applicationMode: dto.applicationMode ?? 'wizard',
        currentStep: 'organisation',
        orgNameSnapshot: org?.name ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /** Update wizard step data (partial save) */
  async update(userId: string, applicationId: string, dto: UpdateApplicationDto) {
    const [app] = await this.db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.applicantId, userId)),
      )
      .limit(1);

    if (!app) throw new NotFoundException('Application not found.');
    if (app.status === 'submitted') {
      throw new ForbiddenException('Submitted applications cannot be edited.');
    }

    const updateValues: Record<string, any> = { updatedAt: new Date() };

    const fields: (keyof UpdateApplicationDto)[] = [
      'orgNameSnapshot', 'projectTitle', 'problemStatement', 'proposedSolution',
      'expectedOutcomes', 'projectLocation', 'projectDistrict', 'projectState',
      'projectDurationMonths', 'beneficiaryCount', 'beneficiaryDescription',
      'teamMembers', 'budgetLines', 'requestedAmount', 'totalBudgetAmount',
      'declarationAccepted', 'currentStep',
    ];

    for (const field of fields) {
      if (dto[field] !== undefined) {
        updateValues[field] = dto[field];
      }
    }

    const [updated] = await this.db
      .update(applications)
      .set(updateValues)
      .where(eq(applications.id, applicationId))
      .returning();

    return updated;
  }

  /** Submit the application — validates required fields, changes status, attaches vault docs */
  async submit(userId: string, applicationId: string) {
    const [app] = await this.db
      .select()
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.applicantId, userId)),
      )
      .limit(1);

    if (!app) throw new NotFoundException('Application not found.');
    if (app.status !== 'draft') {
      throw new BadRequestException('Only draft applications can be submitted.');
    }

    // Validate required fields
    const missing: string[] = [];
    if (!app.projectTitle) missing.push('Project Title');
    if (!app.problemStatement) missing.push('Problem Statement');
    if (!app.proposedSolution) missing.push('Proposed Solution');
    if (!app.expectedOutcomes) missing.push('Expected Outcomes');
    if (!app.projectLocation) missing.push('Project Location');
    if (!app.projectDurationMonths) missing.push('Project Duration');
    if (!app.beneficiaryCount) missing.push('Beneficiary Count');
    if (!(app.teamMembers as any[])?.length) missing.push('At least one Team Member');
    if (!(app.budgetLines as any[])?.length) missing.push('At least one Budget Line');
    if (!app.declarationAccepted) missing.push('Declaration acceptance');

    if (missing.length > 0) {
      throw new BadRequestException(`Please complete the following before submitting: ${missing.join(', ')}.`);
    }

    const now = new Date();

    // Attach vault documents as application documents
    const vaultDocs = await this.db
      .select()
      .from(documentVault)
      .where(eq(documentVault.userId, userId));

    for (const doc of vaultDocs) {
      await this.db
        .insert(applicationDocuments)
        .values({
          applicationId,
          documentType: doc.documentType,
          fileName: doc.fileName,
          filePath: doc.filePath,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          uploadedBy: userId,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    const [submitted] = await this.db
      .update(applications)
      .set({
        status: 'submitted',
        workflowStage: 'screening',
        currentStep: 'submitted',
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(applications.id, applicationId))
      .returning();

    return submitted;
  }
}
