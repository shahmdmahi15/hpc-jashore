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
    'action_grants',
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
    'pin_credentials',
    'refresh_sessions',
    'staff',
    'users',
    'desks',
    'rooms',
    'beds',
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

  console.log('👤 Seeding ONLY the single unverified Admin user:');
  console.log('   Name: Shah Md. Mahi');
  console.log('   Email: shahmdmahi15@gmail.com');
  console.log('   Whatsapp: +8801757290258');
  console.log('   Password: [Set as requested]');
  console.log('   Role: Admin');
  console.log('   Status: Unverified (isActive: 0) — User will activate by resending the verification email.');

  const userId = randomUUID();
  const staffId = randomUUID();
  const passwordHash = bcrypt.hashSync('Iliket90@#$abc', 10);

  // 1. Create User: isActive = 0 (Unverified, cannot log in until email verified)
  await db.insert(schema.users).values({
    id: userId,
    email: 'shahmdmahi15@gmail.com',
    passwordHash,
    role: 'admin',
    displayName: 'Shah Md. Mahi',
    isActive: 0, // Unverified
    mustChangePassword: 0,
    createdAt: now(),
    updatedAt: now(),
  });

  // 2. Create linked Staff record with Whatsapp number
  await db.insert(schema.staff).values({
    id: staffId,
    userId: userId,
    fullName: 'Shah Md. Mahi',
    role: 'admin',
    phone: '+8801757290258',
    specialization: 'System Administrator',
    feeOverridePaisa: null,
    isActive: 0, // Unverified
    createdAt: now(),
    updatedAt: now(),
  });

  console.log('✅ Seeding complete. Exactly ONE unverified user created. Zero mock data.');
  sqlite.close();
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
