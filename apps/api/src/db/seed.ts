// apps/api/src/db/seed.ts
// Clean wipe and single unverified Admin user seed script.
// Run: pnpm --filter @hpc/api seed
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const now = () => new Date().toISOString();

async function main() {
  const dbPath = process.env.DATABASE_PATH ?? './data/hpc.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF');
  sqlite.pragma('busy_timeout = 5000');

  const raw = drizzle(sqlite, { schema });
  // Ensure tables and migrations exist
  migrate(raw, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
  const db = drizzle(sqlite, { schema });

  console.log('🧹 Purging ALL existing data and mock records from database...');

  const tables = [
    'audit_logs',
    'prescription_items',
    'prescriptions',
    'consultations',
    'assessments',
    'therapy_sessions',
    'therapy_plans',
    'package_credits',
    'packages',
    'modalities',
    'serials',
    'visits',
    'patients',
    'bill_items',
    'payments',
    'dues',
    'bills',
    'drawer_events',
    'cash_drawers',
    'stock_moves',
    'batches',
    'medicines',
    'inventory_items',
    'shifts',
    'refresh_sessions',
    'users',
    'rooms',
    'machines',
    'sequences',
    'expenses',
    'announcements',
    'attendance',
  ];

  for (const table of tables) {
    try {
      sqlite.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // Ignore if table does not exist
    }
  }

  sqlite.pragma('foreign_keys = ON');

  console.log('👤 Seeding ONLY the single Admin user:');
  console.log('   Name: Shah Md. Mahi');
  console.log('   Email: shahmdmahi15@gmail.com');
  console.log('   Whatsapp: +8801757290258');
  console.log('   Password: [Set as requested]');
  console.log('   Role: Admin');
  console.log('   Status: Active (isActive: 1)');

  const userId = randomUUID();
  const passwordHash = bcrypt.hashSync('Iliket90@#$abc', 10);

  // 1. Create User: isActive = 1 (Active, direct login enabled)
  await db.insert(schema.users).values({
    id: userId,
    email: 'shahmdmahi15@gmail.com',
    passwordHash,
    role: 'admin',
    displayName: 'Shah Md. Mahi',
    phone: '+8801757290258',
    specialization: 'System Administrator',
    isActive: 1,
    mustChangePassword: 0,
    isApproved: 1,
    approvalStatus: 'approved',
    approvedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });

  // 2. Basic Clinical Modalities
  const modalitiesToSeed = [
    { id: 'mod-ust', code: 'UST', nameEn: 'Ultrasound Therapy (UST)', nameBn: 'আল্ট্রাসাউন্ড থেরাপি (UST)', defaultDurationMin: 15, defaultPricePaisa: 30000 },
    { id: 'mod-swd', code: 'SWD', nameEn: 'Shortwave Diathermy (SWD)', nameBn: 'শর্টওয়েভ ডায়াথার্মি (SWD)', defaultDurationMin: 20, defaultPricePaisa: 40000 },
    { id: 'mod-irr', code: 'IRR', nameEn: 'Infrared Radiation (IRR)', nameBn: 'ইনফ্রারেড রেডিয়েশন (IRR)', defaultDurationMin: 15, defaultPricePaisa: 25000 },
    { id: 'mod-trac', code: 'TRAC', nameEn: 'Traction Therapy', nameBn: 'ট্র্যাকশন থেরাপি', defaultDurationMin: 20, defaultPricePaisa: 35000 },
    { id: 'mod-ex', code: 'EX', nameEn: 'Therapeutic Exercise', nameBn: 'থেরাপিউটিক এক্সারসাইজ', defaultDurationMin: 30, defaultPricePaisa: 50000 },
  ];

  for (const m of modalitiesToSeed) {
    await db.insert(schema.modalities).values({
      id: m.id,
      code: m.code,
      nameEn: m.nameEn,
      nameBn: m.nameBn,
      defaultDurationMin: m.defaultDurationMin,
      defaultPricePaisa: m.defaultPricePaisa,
      isActive: 1,
    });
  }

  console.log('✅ Seeding complete. Exactly ONE admin user and clinical modalities created.');
  sqlite.close();
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
