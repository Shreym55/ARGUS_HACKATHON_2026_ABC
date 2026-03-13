import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { organizations, users } from '../db/schema';

export type OrgProfileDto = {
  name?: string;
  registrationNumber?: string;
  type?: string;
  state?: string;
  address?: string;
  annualBudget?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
};

@Injectable()
export class OrgProfileService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getProfile(userId: string) {
    const [user] = await this.db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('User not found.');
    if (!user.organizationId) return null;

    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    return org ?? null;
  }

  async upsertProfile(userId: string, dto: OrgProfileDto) {
    const [user] = await this.db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('User not found.');

    const now = new Date();
    const values = {
      name: dto.name ?? 'My Organisation',
      registrationNumber: dto.registrationNumber ?? null,
      type: dto.type ?? null,
      state: dto.state ?? null,
      address: dto.address ?? null,
      annualBudget: dto.annualBudget != null ? String(dto.annualBudget) : null,
      contactPerson: dto.contactPerson ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      website: dto.website ?? null,
      updatedAt: now,
    };

    if (user.organizationId) {
      const [updated] = await this.db
        .update(organizations)
        .set(values)
        .where(eq(organizations.id, user.organizationId))
        .returning();
      return updated;
    }

    // Create new org and link to user
    const [created] = await this.db
      .insert(organizations)
      .values({ ...values, createdAt: now })
      .returning();

    await this.db
      .update(users)
      .set({ organizationId: created.id, updatedAt: now })
      .where(eq(users.id, userId));

    return created;
  }
}
