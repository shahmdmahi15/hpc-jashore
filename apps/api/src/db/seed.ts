// Idempotent Phase 1 seed. Run: pnpm --filter @hpc/api seed
// Seeds LOCAL-ONLY logins (admin@hpc.local, toufiq@hpc.local) with temp passwords.
// Real emails are never seeded — production accounts are created in the admin panel.
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const now = () => new Date().toISOString();
const thisYear = new Date().getFullYear();

async function main() {
  const dbPath = process.env.DATABASE_PATH ?? './data/hpc.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const raw = drizzle(sqlite, { schema });
  // src/db/seed.ts → ../../drizzle = apps/api/drizzle (cwd-independent).
  migrate(raw, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
  const db = drizzle(sqlite, { schema });

  // The migrator-flavoured drizzle instance lacks typed helpers; re-wrap plainly.
  void raw;

  const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

  async function upsertUser(input: {
    email: string;
    password: string;
    role: schema.Role;
    displayName: string;
  }) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, input.email));
    if (existing.length > 0) return existing[0];
    const row = {
      id: randomUUID(),
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      displayName: input.displayName,
      isActive: 1,
      mustChangePassword: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(schema.users).values(row);
    return row;
  }

  async function upsertStaff(input: {
    userId: string | null;
    fullName: string;
    role: schema.Role;
    phone?: string;
    specialization?: string;
  }) {
    const existing = await db.select().from(schema.staff);
    const hit = existing.find(
      (s) => s.fullName === input.fullName && s.role === input.role,
    );
    if (hit) return hit;
    const row = {
      id: randomUUID(),
      userId: input.userId,
      fullName: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      specialization: input.specialization ?? null,
      feeOverridePaisa: null,
      isActive: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(schema.staff).values(row);
    return row;
  }

  async function upsertPin(staffId: string, pin: string) {
    const existing = await db
      .select()
      .from(schema.pinCredentials)
      .where(eq(schema.pinCredentials.staffId, staffId));
    if (existing.length > 0) return;
    await db.insert(schema.pinCredentials).values({
      staffId,
      pinHash: bcrypt.hashSync(pin, 10),
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now(),
      updatedBy: null,
    });
  }

  // --- Users (local-only) -----------------------------------------------------
  const admin = await upsertUser({
    email: 'admin@hpc.local',
    password: 'Admin123!',
    role: 'admin',
    displayName: 'Administrator',
  });
  const headDoctor = await upsertUser({
    email: 'toufiq@hpc.local',
    password: 'Toufiq123!',
    role: 'head_doctor',
    displayName: 'Dr. Toufiq (Md. Toufiq Uz Zaman)',
  });
  const demoDoctor = await upsertUser({
    email: 'doctor@hpc.local',
    password: 'Doctor123!',
    role: 'doctor',
    displayName: 'Dr. Demo',
  });
  const receptionUser = await upsertUser({
    email: 'reception@hpc.local',
    password: 'Desk1234!',
    role: 'reception',
    displayName: 'Reception Desk',
  });
  const therapistUser = await upsertUser({
    email: 'therapist@hpc.local',
    password: 'Desk1234!',
    role: 'therapist',
    displayName: 'Therapy Desk',
  });
  const cashierUser = await upsertUser({
    email: 'cashier@hpc.local',
    password: 'Desk1234!',
    role: 'cashier',
    displayName: 'Cashier Desk',
  });

  // --- Staff -------------------------------------------------------------------
  const headDoctorStaff = await upsertStaff({
    userId: headDoctor.id,
    fullName: 'Dr. Toufiq (Md. Toufiq Uz Zaman)',
    role: 'head_doctor',
    specialization: 'Physiotherapy — Head Doctor',
  });
  await upsertStaff({
    userId: demoDoctor.id,
    fullName: 'Dr. Demo',
    role: 'doctor',
    specialization: 'Physiotherapy',
  });
  const receptionStaff = await upsertStaff({
    userId: receptionUser.id,
    fullName: 'Reception Staff 1',
    role: 'reception',
    phone: '01XXXXXXXXX',
  });
  const therapistStaff = await upsertStaff({
    userId: therapistUser.id,
    fullName: 'Therapist Staff 1',
    role: 'therapist',
    phone: '01XXXXXXXXX',
  });
  const cashierStaff = await upsertStaff({
    userId: cashierUser.id,
    fullName: 'Cashier Staff 1',
    role: 'cashier',
    phone: '01XXXXXXXXX',
  });

  // Demo PINs (non-sequential, must be changed before go-live).
  await upsertPin(receptionStaff.id, '2468');
  await upsertPin(therapistStaff.id, '3579');
  await upsertPin(cashierStaff.id, '4826');

  // --- Desks -------------------------------------------------------------------
  for (const desk of [
    { code: 'Reception-1', type: 'reception', name: 'Reception Desk 1' },
    { code: 'Therapy-A', type: 'therapy', name: 'Therapy Desk A' },
    { code: 'Cashier-1', type: 'cashier', name: 'Cashier Desk 1' },
  ] as const) {
    const existing = await db
      .select()
      .from(schema.desks)
      .where(eq(schema.desks.code, desk.code));
    if (existing.length === 0) {
      await db.insert(schema.desks).values({
        id: randomUUID(),
        code: desk.code,
        type: desk.type,
        name: desk.name,
        roomId: null,
        isActive: 1,
      });
    }
  }

  // --- Rooms -------------------------------------------------------------------
  for (const room of [
    { code: 'consult-1', name: 'Consultation Room 1', type: 'consult' },
    { code: 'therapy-a', name: 'Therapy Hall A', type: 'therapy' },
  ] as const) {
    const existing = await db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.code, room.code));
    if (existing.length === 0) {
      await db.insert(schema.rooms).values({
        id: randomUUID(),
        code: room.code,
        name: room.name,
        type: room.type,
        isActive: 1,
      });
    }
  }

  // --- Modalities ---------------------------------------------------------------
  for (const mod of [
    { code: 'IFT', en: 'Interferential Therapy', bn: 'আইএফটি', min: 15, paisa: 30000 },
    { code: 'UST', en: 'Ultrasound Therapy', bn: 'আলট্রাসাউন্ড', min: 10, paisa: 25000 },
    { code: 'SWD', en: 'Shortwave Diathermy', bn: 'শর্টওয়েভ', min: 20, paisa: 35000 },
    { code: 'EXE', en: 'Therapeutic Exercise', bn: 'থেরাপিউটিক ব্যায়াম', min: 30, paisa: 20000 },
  ]) {
    const existing = await db
      .select()
      .from(schema.modalities)
      .where(eq(schema.modalities.code, mod.code));
    if (existing.length === 0) {
      await db.insert(schema.modalities).values({
        id: randomUUID(),
        code: mod.code,
        nameEn: mod.en,
        nameBn: mod.bn,
        defaultDurationMin: mod.min,
        defaultPricePaisa: mod.paisa,
        isActive: 1,
      });
    }
  }

  // --- Sequences -----------------------------------------------------------------
  const seqExisting = await db.select().from(schema.sequences);
  if (!seqExisting.some((s) => s.scope === 'mrn' && s.year === thisYear)) {
    await db.insert(schema.sequences).values({
      scope: 'mrn',
      year: thisYear,
      lastValue: 0,
    });
  }

  // --- Settings -------------------------------------------------------------------
  const settingsSeed: Record<string, unknown> = {
    'clinic.profile': {
      name: 'HPC Health & Pain Care Center',
      nameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার',
      address: 'Jashore, Bangladesh',
      phone: '01XXXXXXXXX',
    },
    'fees.consult_default': { amountPaisa: 50000, currency: 'BDT' },
    'print.header': {
      linesEn: ['HPC Health & Pain Care Center, Jashore'],
      linesBn: ['এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর'],
    },
    'mrn.format': 'HPC-YY-00001',
  };
  for (const [key, value] of Object.entries(settingsSeed)) {
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));
    if (existing.length === 0) {
      await db.insert(schema.settings).values({
        key,
        valueJson: JSON.stringify(value),
        updatedBy: admin.id,
        updatedAt: now(),
      });
    }
  }

  // --- Beds & Machines -----------------------------------------------------------
  const therapyHall = (await db.select().from(schema.rooms).where(eq(schema.rooms.code, 'therapy-a')))[0];
  if (therapyHall) {
    for (const b of [
      { code: 'BED-01', name: 'Bed 01 (General)' },
      { code: 'BED-02', name: 'Bed 02 (Traction)' },
      { code: 'BED-03', name: 'Bed 03 (General)' },
      { code: 'BED-04', name: 'Bed 04 (VIP)' },
    ]) {
      const existing = await db.select().from(schema.beds).where(eq(schema.beds.code, b.code));
      if (existing.length === 0) {
        await db.insert(schema.beds).values({
          id: randomUUID(),
          roomId: therapyHall.id,
          code: b.code,
          name: b.name,
          isActive: 1,
        });
      }
    }

    for (const m of [
      { code: 'IFT-01', name: 'IFT Digital Pro-4', mod: 'IFT' },
      { code: 'UST-01', name: 'Sonopuls Ultrasound 190', mod: 'UST' },
      { code: 'SWD-01', name: 'Curapuls Shortwave 670', mod: 'SWD' },
    ]) {
      const existing = await db.select().from(schema.machines).where(eq(schema.machines.code, m.code));
      if (existing.length === 0) {
        await db.insert(schema.machines).values({
          id: randomUUID(),
          roomId: therapyHall.id,
          code: m.code,
          name: m.name,
          modalityCode: m.mod,
          status: 'available',
          isActive: 1,
        });
      }
    }
  }

  // --- Medicines & Batches --------------------------------------------------------
  for (const med of [
    { brand: 'Naprosyn 500', generic: 'Naproxen', form: 'tablet', strength: '500mg', mfg: 'Square Pharmaceuticals', pricePaisa: 1200 },
    { brand: 'Myolax 50', generic: 'Tolperisone HCl', form: 'tablet', strength: '50mg', mfg: 'Incepta Pharma', pricePaisa: 1000 },
    { brand: 'Maxpro 20', generic: 'Esomeprazole', form: 'capsule', strength: '20mg', mfg: 'Square Pharmaceuticals', pricePaisa: 700 },
    { brand: 'Voltalin Emulgel', generic: 'Diclofenac Diethylamine', form: 'gel', strength: '20g', mfg: 'Novartis', pricePaisa: 18000 },
  ]) {
    const existing = await db.select().from(schema.medicines).where(eq(schema.medicines.brandName, med.brand));
    let medId: string;
    if (existing.length === 0) {
      medId = randomUUID();
      await db.insert(schema.medicines).values({
        id: medId,
        brandName: med.brand,
        genericName: med.generic,
        manufacturer: med.mfg,
        form: med.form,
        strength: med.strength,
        minStockAlert: 20,
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      });
      // Add initial batch
      await db.insert(schema.batches).values({
        id: randomUUID(),
        medicineId: medId,
        batchNumber: `B26-${med.brand.substring(0, 3).toUpperCase()}`,
        mfgDate: '2025-01-01',
        expDate: '2027-12-31',
        purchaseRatePaisa: Math.round(med.pricePaisa * 0.75),
        mrpPaisa: med.pricePaisa,
        quantityInStock: 100,
        isBlocked: 0,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  // --- Therapy Packages ----------------------------------------------------------
  for (const pkg of [
    {
      en: 'Lumbar Spine & Sciatica Rehab (10 Sessions)',
      bn: 'কোমর ও সায়াটিকা ব্যথা পুনর্বাসন প্যাকেজ',
      cons: 2,
      sess: 10,
      days: 30,
      price: 300000,
    },
    {
      en: 'Cervical Spondylosis Neck Care (7 Sessions)',
      bn: 'ঘাড় ও কাঁধ ব্যথা ফিজিওথেরাপি প্যাকেজ',
      cons: 1,
      sess: 7,
      days: 21,
      price: 210000,
    },
    {
      en: 'Knee Osteoarthritis Mobility Package (12 Sessions)',
      bn: 'হাঁটুর বাত ও ক্ষয় পুনর্বাসন প্যাকেজ',
      cons: 2,
      sess: 12,
      days: 45,
      price: 360000,
    },
  ]) {
    const existing = await db.select().from(schema.packages).where(eq(schema.packages.nameEn, pkg.en));
    if (existing.length === 0) {
      await db.insert(schema.packages).values({
        id: randomUUID(),
        nameEn: pkg.en,
        nameBn: pkg.bn,
        totalConsultations: pkg.cons,
        totalTherapySessions: pkg.sess,
        validityDays: pkg.days,
        pricePaisa: pkg.price,
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  // --- Sample Demo Patients & Queues ----------------------------------------------
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingPatients = await db.select().from(schema.patients);
  if (existingPatients.length === 0) {
    const p1Id = randomUUID();
    const p2Id = randomUUID();
    await db.insert(schema.patients).values([
      {
        id: p1Id,
        mrn: `HPC-${String(thisYear).slice(-2)}-00001`,
        nameEn: 'Md. Abdul Karim',
        nameBn: 'মোঃ আব্দুল করিম',
        phone: '01712345678',
        ageYears: 52,
        gender: 'male',
        address: 'Chanchra, Jashore',
        bloodGroup: 'B+',
        allergies: 'Penicillin allergy',
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: p2Id,
        mrn: `HPC-${String(thisYear).slice(-2)}-00002`,
        nameEn: 'Rahima Khatun',
        nameBn: 'রাহিমা খাতুন',
        phone: '01898765432',
        ageYears: 46,
        gender: 'female',
        address: 'Kotwali, Jashore',
        bloodGroup: 'O+',
        allergies: null,
        createdAt: now(),
        updatedAt: now(),
      },
    ]);

    // Create a visit and queue serial for today for Abdul Karim
    const visitId = randomUUID();
    await db.insert(schema.visits).values({
      id: visitId,
      patientId: p1Id,
      doctorId: headDoctorStaff.id,
      tokenNumber: 1,
      visitDate: todayStr,
      status: 'checked_in',
      priority: 'normal',
      currentLocation: 'waiting_room',
      checkedInAt: now(),
      createdAt: now(),
      updatedAt: now(),
    });

    await db.insert(schema.serials).values({
      id: randomUUID(),
      doctorId: headDoctorStaff.id,
      date: todayStr,
      serialNumber: 1,
      visitId: visitId,
      patientId: p1Id,
      status: 'waiting',
      createdAt: now(),
      updatedAt: now(),
    });
  }

  // eslint-disable-next-line no-console
  console.log(`seed complete: admin=${admin.email} head_doctor=${headDoctor.email}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('seed failed:', err);
  process.exit(1);
});
