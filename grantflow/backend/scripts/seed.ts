/**
 * Database seed script.
 *
 * Run from inside the backend container:
 *   npx ts-node scripts/seed.ts
 *
 * Or locally (with a local .env containing DATABASE_URL):
 *   npx ts-node scripts/seed.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as crypto from 'crypto';
import * as schema from '../src/db/schema';
import {
  users,
  organizations,
  grantPrograms,
} from '../src/db/schema';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hash(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashed = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hashed}`;
}

// ─── db ───────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── seed data ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...');

  // ── 1. Grantor organisation ────────────────────────────────────────────────
  const [grantor] = await db
    .insert(organizations)
    .values({
      name: 'Argusoft Foundation',
      type: 'Foundation',
      email: 'grants@argusoft.com',
      website: 'https://www.argusoft.com',
      address: 'Argusoft India Ltd, Ahmedabad, Gujarat',
      phone: '+91-79-00000000',
    })
    .onConflictDoNothing()
    .returning();

  const grantorOrgId = grantor?.id;
  console.log('  ✓ Grantor organisation');

  // ── 2. Platform admin user ─────────────────────────────────────────────────
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@grantflow.com',
      passwordHash: hash('Admin@1234'),
      fullName: 'Platform Admin',
      role: 'admin',
      organizationId: grantorOrgId ?? null,
    })
    .onConflictDoNothing()
    .returning();

  const adminId = admin?.id;
  console.log('  ✓ Platform admin user  (email: admin@grantflow.com | password: Admin@1234)');

  // ── 3. Staff accounts ──────────────────────────────────────────────────────
  const staffSeeds = [
    {
      email: 'officer@grantflow.com',
      fullName: 'Priya Sharma',
      role: 'program_manager' as const,
      password: 'Officer@1234',
    },
    {
      email: 'reviewer@grantflow.com',
      fullName: 'Arjun Mehta',
      role: 'reviewer' as const,
      password: 'Reviewer@1234',
    },
    {
      email: 'finance@grantflow.com',
      fullName: 'Neha Patel',
      role: 'reviewer' as const,   // finance_officer maps to reviewer in our enum — extend when needed
      password: 'Finance@1234',
    },
  ];

  for (const s of staffSeeds) {
    await db
      .insert(users)
      .values({
        email: s.email,
        passwordHash: hash(s.password),
        fullName: s.fullName,
        role: s.role,
        organizationId: grantorOrgId ?? null,
      })
      .onConflictDoNothing();
  }
  console.log('  ✓ Staff accounts (officer / reviewer / finance)');

  // ── 4. Grant programmes ────────────────────────────────────────────────────
  if (!adminId) {
    console.warn('  ⚠ Admin user already existed — looking up id for grant programmes...');
  }

  const createdBy = adminId ?? (
    await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, 'admin@grantflow.com'),
    })
  )?.id;

  if (!createdBy) throw new Error('Cannot resolve admin user id for grant programmes');

  // ── CDG ───────────────────────────────────────────────────────────────────
  await db
    .insert(grantPrograms)
    .values({
      name: 'Community Development Grant (CDG)',
      description:
        'Funds community-level infrastructure and social service projects in rural and semi-urban India. ' +
        'Targets registered NGOs, Trusts, and Section 8 Companies with a minimum 2-year operating history.',
      grantType: 'foundation',
      totalBudget: '20000000',          // INR 2 Crore
      availableBudget: '20000000',
      minAmount: '200000',              // INR 2 L
      maxAmount: '2000000',             // INR 20 L
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      isActive: true,
      createdBy,
    })
    .onConflictDoNothing();
  console.log('  ✓ CDG — Community Development Grant');

  // ── EIG ───────────────────────────────────────────────────────────────────
  await db
    .insert(grantPrograms)
    .values({
      name: 'Education Innovation Grant (EIG)',
      description:
        'Funds technology-enabled or pedagogy-innovation projects improving learning outcomes in ' +
        'government schools. Open to NGOs, EdTech non-profits, research institutions, and universities.',
      grantType: 'foundation',
      totalBudget: '50000000',          // INR 5 Crore / year
      availableBudget: '50000000',
      minAmount: '500000',              // INR 5 L
      maxAmount: '5000000',             // INR 50 L
      startDate: null,                  // rolling — reviewed quarterly
      endDate: null,
      isActive: true,
      createdBy,
    })
    .onConflictDoNothing();
  console.log('  ✓ EIG — Education Innovation Grant');

  // ── ECAG ──────────────────────────────────────────────────────────────────
  await db
    .insert(grantPrograms)
    .values({
      name: 'Environment & Climate Action Grant (ECAG)',
      description:
        'Funds grassroots environmental conservation, climate resilience, and clean energy access projects. ' +
        'Open to NGOs, Farmer Producer Organisations (FPOs), Panchayat bodies, and research institutions. ' +
        'Priority given to climate-vulnerable districts (coastal, drought-prone, flood-prone, hill regions).',
      grantType: 'foundation',
      totalBudget: '30000000',          // INR 3 Crore / year
      availableBudget: '30000000',
      minAmount: '300000',              // INR 3 L
      maxAmount: '3000000',             // INR 30 L
      startDate: '2026-07-01',
      endDate: '2026-08-31',
      isActive: true,
      createdBy,
    })
    .onConflictDoNothing();
  console.log('  ✓ ECAG — Environment & Climate Action Grant');

  // ── 5. Demo applicant organisation + user ─────────────────────────────────
  const [demoOrg] = await db
    .insert(organizations)
    .values({
      name: 'Greenroots Foundation',
      type: 'NGO',
      ein: 'NGO/MH/2019/00123',
      address: 'Pune, Maharashtra',
      phone: '+91-98765-43210',
      email: 'contact@greenroots.org',
    })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(users)
    .values({
      email: 'applicant@greenroots.org',
      passwordHash: hash('Applicant@1234'),
      fullName: 'Ravi Kumar',
      role: 'applicant',
      organizationId: demoOrg?.id ?? null,
    })
    .onConflictDoNothing();

  console.log('  ✓ Demo applicant (email: applicant@greenroots.org | password: Applicant@1234)');

  console.log('\n✅ Seed complete.\n');
  console.log('Seeded accounts:');
  console.log('  admin@grantflow.com         Admin@1234     (Platform Admin)');
  console.log('  officer@grantflow.com       Officer@1234   (Program Officer)');
  console.log('  reviewer@grantflow.com      Reviewer@1234  (Grant Reviewer)');
  console.log('  finance@grantflow.com       Finance@1234   (Finance Officer)');
  console.log('  applicant@greenroots.org    Applicant@1234 (Demo Applicant)');
  console.log('\nSeeded grant programmes: CDG | EIG | ECAG\n');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
