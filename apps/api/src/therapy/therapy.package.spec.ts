// apps/api/src/therapy/therapy.package.spec.ts
// Runnable with: pnpm --filter @hpc/api exec ts-node -T src/therapy/therapy.package.spec.ts
import 'reflect-metadata';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { TherapyService } from './therapy.service';
import type { AuditService } from '../audit/audit.service';
import type { EventsGateway } from '../realtime/events.gateway';
import type { RealtimeService } from '../realtime/realtime.service';

// --- In-Memory SQLite Setup --------------------------------------------------

const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = OFF');

sqlite.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    display_name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    consultation_fee_paisa INTEGER NOT NULL DEFAULT 50000,
    follow_up_fee_paisa INTEGER NOT NULL DEFAULT 0,
    report_fee_paisa INTEGER NOT NULL DEFAULT 0,
    chamber_room_id TEXT,
    specialization TEXT,
    qualifications TEXT,
    bmdc_reg_no TEXT,
    qualifications_json TEXT,
    daily_quota INTEGER DEFAULT 40,
    slot_duration_minutes INTEGER DEFAULT 15,
    duty_start_time TEXT,
    duty_end_time TEXT,
    available_days TEXT,
    notes TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TEXT,
    rejected_reason TEXT,
    rejection_reason TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    mrn TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    age_years INTEGER,
    gender TEXT NOT NULL,
    blood_group TEXT,
    address TEXT,
    occupation TEXT,
    emergency_contact TEXT,
    guardian_name TEXT,
    referral_source TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    contraindications TEXT,
    medical_history_notes TEXT,
    notes TEXT,
    consent_signed INTEGER NOT NULL DEFAULT 1,
    registered_by TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE modalities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    default_duration_min INTEGER NOT NULL DEFAULT 20,
    default_price_paisa INTEGER NOT NULL DEFAULT 0,
    requires_machine INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    room_number INTEGER NOT NULL UNIQUE,
    name TEXT,
    type TEXT NOT NULL DEFAULT 'therapy_hall',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE packages (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    package_type TEXT NOT NULL DEFAULT 'per_session',
    total_consultations INTEGER NOT NULL DEFAULT 9999,
    total_therapy_sessions INTEGER NOT NULL DEFAULT 10,
    total_days INTEGER DEFAULT 10,
    validity_days INTEGER NOT NULL DEFAULT 30,
    price_paisa INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE package_credits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    bill_id TEXT,
    remaining_consultations INTEGER NOT NULL DEFAULT 9999,
    remaining_sessions INTEGER NOT NULL DEFAULT 0,
    remaining_days INTEGER NOT NULL DEFAULT 0,
    visited_dates_json TEXT NOT NULL DEFAULT '[]',
    purchased_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE therapy_plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    prescribed_by TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    total_sessions_prescribed INTEGER NOT NULL,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    frequency_per_week INTEGER,
    clinical_goals TEXT,
    special_precautions TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE therapy_sessions (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    patient_id TEXT NOT NULL,
    therapist_staff_id TEXT,
    bed_id TEXT,
    modality_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    started_at TEXT,
    ended_at TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    outcome_note TEXT,
    pain_score_after INTEGER,
    is_overtime INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    actor_role TEXT,
    desk_id TEXT,
    pin_staff_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    ip TEXT,
    request_id TEXT,
    occurred_at TEXT NOT NULL
  );

  CREATE TABLE visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    token_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered',
    current_location TEXT NOT NULL DEFAULT 'reception',
    room_id TEXT,
    doctor_id TEXT,
    therapy_booking_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE patient_timeline_events (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    visit_id TEXT,
    step TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    actor_id TEXT,
    actor_role TEXT,
    occurred_at TEXT NOT NULL,
    date TEXT NOT NULL
  );
`);

sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

// Mock Dependencies
const mockAudit = {
  log: async () => {},
} as unknown as AuditService;

const mockGateway = {
  emit: () => {},
} as unknown as EventsGateway;

const mockRealtime = {
  publish: () => {},
} as unknown as RealtimeService;

const therapyService = new TherapyService(db as any, mockAudit, mockGateway, mockRealtime);

const actor = { sub: 'user-admin-1', role: 'admin' };
const meta = { ip: '127.0.0.1', requestId: 'req-test-1' };

// Date Mock Helper for Time-Travel across different visit days
const RealDate = Date;
function setMockDate(isoString: string) {
  const mockTime = new Date(isoString).getTime();
  global.Date = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockTime);
      } else {
        super(...(args as [any]));
      }
    }
    static override now() {
      return mockTime;
    }
  } as unknown as DateConstructor;
}

function restoreDate() {
  global.Date = RealDate;
}

// --- Test Suite Execution ----------------------------------------------------

async function runTests() {
  console.log('--- Running Therapy Package & Session Completion Test Suite ---');

  // Seed baseline lookup records
  const therapistId = randomUUID();
  const nowStr = new Date().toISOString();
  await db.insert(schema.users).values({
    id: therapistId,
    email: 'therapist@hpc.com',
    passwordHash: 'hash',
    role: 'handler',
    displayName: 'Test Therapist',
    isActive: 1,
    createdAt: nowStr,
    updatedAt: nowStr,
  });

  await db.insert(schema.modalities).values({
    id: randomUUID(),
    code: 'PHYSIO',
    nameEn: 'Physiotherapy',
    nameBn: 'ফিজিওথেরাপি',
    defaultDurationMin: 30,
    defaultPricePaisa: 50000,
    isActive: 1,
  });

  const patientPerSessionId = randomUUID();
  await db.insert(schema.patients).values({
    id: patientPerSessionId,
    mrn: 'HPC-2026-90001',
    nameEn: 'Session Patient',
    phone: '01700000001',
    gender: 'male',
    createdAt: nowStr,
    updatedAt: nowStr,
  });

  const patientPerDayId = randomUUID();
  await db.insert(schema.patients).values({
    id: patientPerDayId,
    mrn: 'HPC-2026-90002',
    nameEn: 'Day Patient',
    phone: '01700000002',
    gender: 'female',
    createdAt: nowStr,
    updatedAt: nowStr,
  });

  // ===========================================================================
  // TEST 1: Purchasing 'per_session' package (10 sessions)
  // ===========================================================================
  const pkgSessionId = randomUUID();
  await db.insert(schema.packages).values({
    id: pkgSessionId,
    nameEn: '10 Sessions Rehab',
    nameBn: '১০ সেশন রিহ্যাব',
    packageType: 'per_session',
    totalConsultations: 1,
    totalTherapySessions: 10,
    totalDays: null as any,
    validityDays: 30,
    pricePaisa: 500000,
    isActive: 1,
    createdAt: nowStr,
    updatedAt: nowStr,
  } as any);

  const purchaseSessionCredit = await therapyService.purchasePackage(
    actor,
    { patientId: patientPerSessionId, packageId: pkgSessionId },
    meta,
  );

  assert.strictEqual(
    purchaseSessionCredit.remainingSessions,
    10,
    'Purchasing per_session package must initialize remainingSessions = 10',
  );
  assert.strictEqual(purchaseSessionCredit.status, 'active');

  // Verify in database
  const [sessionCreditRow] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseSessionCredit.id));
  assert.strictEqual(sessionCreditRow.remainingSessions, 10);
  console.log('✓ TEST 1 Passed: Purchasing per_session package initializes remainingSessions = 10');

  // ===========================================================================
  // TEST 2: Purchasing 'per_day' package (10 days)
  // ===========================================================================
  const pkgDayId = randomUUID();
  await db.insert(schema.packages).values({
    id: pkgDayId,
    nameEn: '10 Days Unlimited Rehab',
    nameBn: '১০ দিন আনলিমিটেড রিহ্যাব',
    packageType: 'per_day',
    totalConsultations: 1,
    totalTherapySessions: 10,
    totalDays: 10 as any,
    validityDays: 30,
    pricePaisa: 800000,
    isActive: 1,
    createdAt: nowStr,
    updatedAt: nowStr,
  } as any);

  const purchaseDayCredit = await therapyService.purchasePackage(
    actor,
    { patientId: patientPerDayId, packageId: pkgDayId },
    meta,
  );

  const [dayCreditRow] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  assert.strictEqual(
    (dayCreditRow as any).remainingDays,
    10,
    'Purchasing per_day package must initialize remainingDays = 10',
  );
  assert.strictEqual(
    (dayCreditRow as any).visitedDatesJson,
    '[]',
    'Purchasing per_day package must initialize visitedDatesJson = "[]"',
  );
  assert.strictEqual(dayCreditRow.status, 'active');
  console.log('✓ TEST 2 Passed: Purchasing per_day package initializes remainingDays = 10 and visitedDatesJson = "[]"');

  // ===========================================================================
  // TEST 3: Session completion under 'per_session' package
  // ===========================================================================
  const session1 = await therapyService.startSession(
    actor,
    therapistId,
    { patientId: patientPerSessionId, modalityCode: 'PHYSIO' },
    meta,
  );

  await therapyService.completeSession(actor, session1.id, { durationMinutes: 30 }, meta);

  const [afterComplete1] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseSessionCredit.id));

  assert.strictEqual(
    afterComplete1.remainingSessions,
    9,
    'Session completion under per_session package must decrement remainingSessions by 1 (10 -> 9)',
  );
  assert.strictEqual(afterComplete1.status, 'active');
  console.log('✓ TEST 3 Passed: Session completion under per_session decrements remainingSessions by 1');

  // ===========================================================================
  // TEST 4: Session completion under 'per_day' package
  // ===========================================================================

  // 4a. First visit today: decrements remainingDays by 1 (10 -> 9) and records today
  setMockDate('2026-10-25T10:00:00.000Z');
  const daySession1 = await therapyService.startSession(
    actor,
    therapistId,
    { patientId: patientPerDayId, modalityCode: 'PHYSIO' },
    meta,
  );
  await therapyService.completeSession(actor, daySession1.id, { durationMinutes: 30 }, meta);

  const [afterDay1] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  assert.strictEqual(
    (afterDay1 as any).remainingDays,
    9,
    'First visit today must decrement remainingDays from 10 to 9',
  );
  const visitedDates1 = JSON.parse((afterDay1 as any).visitedDatesJson || '[]');
  assert.deepStrictEqual(
    visitedDates1,
    ['2026-10-25'],
    'First visit today must append 2026-10-25 into visitedDatesJson',
  );
  assert.strictEqual(afterDay1.status, 'active');
  console.log('✓ TEST 4a Passed: First visit today decrements remainingDays by 1 and records date');

  // 4b. Second visit on the SAME day: does NOT decrement remainingDays (counts as 1 day)
  setMockDate('2026-10-25T14:30:00.000Z');
  const daySession2 = await therapyService.startSession(
    actor,
    therapistId,
    { patientId: patientPerDayId, modalityCode: 'PHYSIO' },
    meta,
  );
  await therapyService.completeSession(actor, daySession2.id, { durationMinutes: 45 }, meta);

  const [afterDay2SameDate] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  assert.strictEqual(
    (afterDay2SameDate as any).remainingDays,
    9,
    'Second visit on the SAME day must NOT decrement remainingDays (must remain 9)',
  );
  const visitedDates2 = JSON.parse((afterDay2SameDate as any).visitedDatesJson || '[]');
  assert.strictEqual(
    visitedDates2.length,
    1,
    'Second visit on the SAME day must not duplicate date in visitedDatesJson',
  );
  console.log('✓ TEST 4b Passed: Second visit on same day does NOT decrement remainingDays');

  // 4c. Visit on a DIFFERENT day: decrements remainingDays by 1 (9 -> 8)
  setMockDate('2026-10-26T09:00:00.000Z');
  const daySession3 = await therapyService.startSession(
    actor,
    therapistId,
    { patientId: patientPerDayId, modalityCode: 'PHYSIO' },
    meta,
  );
  await therapyService.completeSession(actor, daySession3.id, { durationMinutes: 30 }, meta);

  const [afterDay3DifferentDate] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  assert.strictEqual(
    (afterDay3DifferentDate as any).remainingDays,
    8,
    'Visit on a DIFFERENT day must decrement remainingDays from 9 to 8',
  );
  const visitedDates3 = JSON.parse((afterDay3DifferentDate as any).visitedDatesJson || '[]');
  assert.deepStrictEqual(
    visitedDates3,
    ['2026-10-25', '2026-10-26'],
    'Visit on different day must append new date to visitedDatesJson',
  );
  console.log('✓ TEST 4c Passed: Visit on different day decrements remainingDays by 1');

  // 4d. When remainingDays reaches 0: status becomes 'exhausted'
  // Artificially advance remainingDays to 1
  await db
    .update(schema.packageCredits)
    .set({ remainingDays: 1 as any })
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  setMockDate('2026-10-27T11:00:00.000Z');
  const daySessionFinal = await therapyService.startSession(
    actor,
    therapistId,
    { patientId: patientPerDayId, modalityCode: 'PHYSIO' },
    meta,
  );
  await therapyService.completeSession(actor, daySessionFinal.id, { durationMinutes: 25 }, meta);

  const [afterExhausted] = await db
    .select()
    .from(schema.packageCredits)
    .where(eq(schema.packageCredits.id, purchaseDayCredit.id));

  assert.strictEqual((afterExhausted as any).remainingDays, 0, 'Remaining days must reach 0');
  assert.strictEqual(
    afterExhausted.status,
    'exhausted',
    'Package credit status must transition to "exhausted" when remaining reaches 0',
  );
  console.log('✓ TEST 4d Passed: Status transitions to "exhausted" when remaining reaches 0');

  restoreDate();
  console.log('\n🎉 ALL THERAPY PACKAGE SPECIFICATION TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch((err) => {
  restoreDate();
  console.error('❌ Test execution failed with error:', err);
  process.exit(1);
});