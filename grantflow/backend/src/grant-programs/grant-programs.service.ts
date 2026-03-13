import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { grantPrograms, organizations, users } from '../db/schema';

export type EligibilityCheckDto = {
  orgType: string;
  district: string;
  amountRequested: number;
};

type EligibilityResult = {
  programmeId: string;
  programmeName: string;
  programCode: string | null;
  result: 'Likely Eligible' | 'Likely Not Eligible';
  reasons: string[];
};

@Injectable()
export class GrantProgramsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findAll() {
    return this.db
      .select()
      .from(grantPrograms)
      .where(eq(grantPrograms.isActive, true))
      .orderBy(grantPrograms.createdAt);
  }

  async findOne(id: string) {
    const [programme] = await this.db
      .select()
      .from(grantPrograms)
      .where(and(eq(grantPrograms.id, id), eq(grantPrograms.isActive, true)))
      .limit(1);

    if (!programme) {
      throw new NotFoundException('Grant programme not found.');
    }

    return programme;
  }

  async checkEligibility(dto: EligibilityCheckDto): Promise<EligibilityResult[]> {
    const programmes = await this.findAll();
    return programmes.map((p: any) => this.evaluateEligibility(p, dto));
  }

  async getPersonalisedEligibility(userId: string) {
    const rows = await this.db
      .select({
        userId: users.id,
        orgType: organizations.type,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) throw new NotFoundException('User not found.');
    if (!row.orgType) return { hasProfile: false, results: [] };

    const results = await this.checkEligibility({
      orgType: row.orgType,
      district: 'all',
      // 0 skips the amount check — we only know org type at this point
      amountRequested: 0,
    });

    return { hasProfile: true, orgType: row.orgType, results };
  }

  private evaluateEligibility(programme: any, dto: EligibilityCheckDto): EligibilityResult {
    const reasons: string[] = [];

    // Hard rule 1 — Organisation type
    const eligibleTypes = programme.eligibleOrgTypes as string[] | null;
    if (eligibleTypes && eligibleTypes.length > 0) {
      const match = eligibleTypes.some(
        (t: string) => t.toLowerCase() === dto.orgType?.toLowerCase(),
      );
      if (!match) {
        reasons.push(
          `Organisation type "${dto.orgType}" is not eligible. Eligible types: ${eligibleTypes.join(', ')}.`,
        );
      }
    }

    // Hard rule 2 — Funding amount (skip when amountRequested = 0, e.g. personalised banner)
    if (dto.amountRequested > 0) {
      const min = programme.minAmount ? Number(programme.minAmount) : null;
      const max = programme.maxAmount ? Number(programme.maxAmount) : null;

      if (min !== null && dto.amountRequested < min) {
        reasons.push(
          `Requested amount ₹${dto.amountRequested.toLocaleString('en-IN')} is below the minimum of ₹${min.toLocaleString('en-IN')}.`,
        );
      }
      if (max !== null && dto.amountRequested > max) {
        reasons.push(
          `Requested amount ₹${dto.amountRequested.toLocaleString('en-IN')} exceeds the maximum of ₹${max.toLocaleString('en-IN')}.`,
        );
      }
    }

    return {
      programmeId: programme.id,
      programmeName: programme.name,
      programCode: programme.programCode ?? null,
      result: reasons.length === 0 ? 'Likely Eligible' : 'Likely Not Eligible',
      reasons,
    };
  }
}
