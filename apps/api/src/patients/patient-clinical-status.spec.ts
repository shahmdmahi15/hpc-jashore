// apps/api/src/patients/patient-clinical-status.spec.ts
// Runnable with: pnpm --filter @hpc/api exec ts-node -T src/patients/patient-clinical-status.spec.ts
import 'reflect-metadata';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { NotFoundException } from '@nestjs/common';
import * as schema from '../db/schema';
import {
  LAPSED_THRESHOLD_DAYS,
  calculateDaysBetween,
  offsetDate,
  evaluateClinicalStatus,
  getPatientClinicalStatus,
} from './patient-clinical-status';

console.log('================================================================');
console.log('HPC JASHORE: 3-TIER PATIENT RECOGNITION TEST SUITE');
console.log('Testing: Brand New, Old Active, Lapsed (>90d), Today Intake, Boundaries');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PART 1: UNIT TESTS (Pure Evaluation Engine)
// -----------------------------------------------------------------------------
console.log('--- PART 1: Pure Evaluation Engine Unit Tests ---');

const REF_DATE = '2026-10-26'; // Fixed reference anchor

// CASE 1: Brand new patient (0 intakes, 0 consultations, 0 therapies)
{
  console.log('Executing Case 1: Brand New Patient...');
  const res = evaluateClinicalStatus({
    patientId: 'patient-brand-new',
    activityDates: [],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res.patientType, 'brand_new', 'Expected patientType === "brand_new"');
  assert.strictEqual(res.requiresIntake, true, 'Expected requiresIntake === true');
  assert.strictEqual(res.isNewPatient, true, 'Expected isNewPatient === true');
  assert.strictEqual(res.isLapsed, false, 'Expected isLapsed === false');
  assert.strictEqual(res.lastActivityDate, null, 'Expected lastActivityDate === null');
  assert.strictEqual(res.daysSinceLastActivity, null, 'Expected daysSinceLastActivity === null');
  assert.strictEqual(res.intakeCompletedToday, false, 'Expected intakeCompletedToday === false');
  assert.strictEqual(res.todayIntakeId, null, 'Expected todayIntakeId === null');
  assert.ok(res.summaryEn.includes('Brand new patient'), 'Summary text check');
  console.log('  [PASS] Case 1 passed: Brand new patient correctly classified');
}

// CASE 2: Old active patient (activity 15 days ago <= 90 days)
{
  console.log('Executing Case 2: Old Active Patient (15 days ago <= 90 days)...');
  const pastDate15 = offsetDate(REF_DATE, -15);
  assert.strictEqual(calculateDaysBetween(REF_DATE, pastDate15), 15);

  const res = evaluateClinicalStatus({
    patientId: 'patient-old-active',
    activityDates: [pastDate15],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res.patientType, 'old_active', 'Expected patientType === "old_active"');
  assert.strictEqual(res.requiresIntake, false, 'Expected requiresIntake === false');
  assert.strictEqual(res.isNewPatient, false, 'Expected isNewPatient === false');
  assert.strictEqual(res.isLapsed, false, 'Expected isLapsed === false');
  assert.strictEqual(res.lastActivityDate, pastDate15, 'Expected lastActivityDate matches 15d ago');
  assert.strictEqual(res.daysSinceLastActivity, 15, 'Expected daysSinceLastActivity === 15');
  assert.strictEqual(res.intakeCompletedToday, false, 'Expected intakeCompletedToday === false');
  assert.strictEqual(res.todayIntakeId, null, 'Expected todayIntakeId === null');
  console.log('  [PASS] Case 2 passed: Old active patient correctly classified');
}

// CASE 3: Lapsed patient (activity was 100 days ago > 90 days)
{
  console.log('Executing Case 3: Lapsed Patient (100 days ago > 90 days)...');
  const pastDate100 = offsetDate(REF_DATE, -100);
  assert.strictEqual(calculateDaysBetween(REF_DATE, pastDate100), 100);

  const res = evaluateClinicalStatus({
    patientId: 'patient-lapsed-100d',
    activityDates: [pastDate100],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res.patientType, 'lapsed_reintake', 'Expected patientType === "lapsed_reintake"');
  assert.strictEqual(res.requiresIntake, true, 'Expected requiresIntake === true (mandatory re-intake)');
  assert.strictEqual(res.isNewPatient, true, 'Expected isNewPatient === true (treated as new for intake)');
  assert.strictEqual(res.isLapsed, true, 'Expected isLapsed === true');
  assert.strictEqual(res.lastActivityDate, pastDate100, 'Expected lastActivityDate matches 100d ago');
  assert.strictEqual(res.daysSinceLastActivity, 100, 'Expected daysSinceLastActivity === 100');
  assert.strictEqual(res.intakeCompletedToday, false, 'Expected intakeCompletedToday === false');
  assert.strictEqual(res.todayIntakeId, null, 'Expected todayIntakeId === null');
  console.log('  [PASS] Case 3 passed: Lapsed patient correctly identified and flagged for re-intake');
}

// CASE 4: Lapsed patient who has had an intake form completed today
{
  console.log('Executing Case 4: Lapsed Patient with Intake Completed Today...');
  const pastDate100 = offsetDate(REF_DATE, -100);
  const todayIntakeId = 'intake-today-uuid-456';

  const res = evaluateClinicalStatus({
    patientId: 'patient-lapsed-reintake-today',
    activityDates: [pastDate100],
    todayIntake: { id: todayIntakeId, date: REF_DATE },
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res.patientType, 'lapsed_reintake', 'Expected patientType === "lapsed_reintake"');
  assert.strictEqual(res.isLapsed, true, 'Expected isLapsed === true');
  assert.strictEqual(res.intakeCompletedToday, true, 'Expected intakeCompletedToday === true');
  assert.strictEqual(res.todayIntakeId, todayIntakeId, 'Expected todayIntakeId populated');
  assert.strictEqual(res.requiresIntake, false, 'Expected requiresIntake === false (already completed today)');
  console.log('  [PASS] Case 4 passed: Today completed intake recognized for lapsed patient');
}

// CASE 5: Boundary tests: exact 90 days vs 91 days
{
  console.log('Executing Case 5: Boundary Tests (Exact 90 days vs 91 days)...');

  // Boundary 5A: Exact 90 days ago (<= 90 days => old_active)
  const pastDate90 = offsetDate(REF_DATE, -90);
  assert.strictEqual(calculateDaysBetween(REF_DATE, pastDate90), 90);

  const res90 = evaluateClinicalStatus({
    patientId: 'patient-boundary-90d',
    activityDates: [pastDate90],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res90.daysSinceLastActivity, 90, 'Expected exactly 90 days');
  assert.strictEqual(res90.patientType, 'old_active', 'Exact 90 days must be "old_active"');
  assert.strictEqual(res90.requiresIntake, false, 'Exact 90 days does not require intake');
  assert.strictEqual(res90.isNewPatient, false, 'Exact 90 days is not new patient');
  assert.strictEqual(res90.isLapsed, false, 'Exact 90 days is not lapsed');

  // Boundary 5B: Exact 91 days ago (> 90 days => lapsed_reintake)
  const pastDate91 = offsetDate(REF_DATE, -91);
  assert.strictEqual(calculateDaysBetween(REF_DATE, pastDate91), 91);

  const res91 = evaluateClinicalStatus({
    patientId: 'patient-boundary-91d',
    activityDates: [pastDate91],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res91.daysSinceLastActivity, 91, 'Expected exactly 91 days');
  assert.strictEqual(res91.patientType, 'lapsed_reintake', 'Exact 91 days must be "lapsed_reintake"');
  assert.strictEqual(res91.requiresIntake, true, 'Exact 91 days requires mandatory re-intake');
  assert.strictEqual(res91.isNewPatient, true, 'Exact 91 days is classified as new patient');
  assert.strictEqual(res91.isLapsed, true, 'Exact 91 days is lapsed');

  // Boundary 5C: 89 days ago (<= 90 days => old_active)
  const pastDate89 = offsetDate(REF_DATE, -89);
  const res89 = evaluateClinicalStatus({
    patientId: 'patient-boundary-89d',
    activityDates: [pastDate89],
    todayIntake: null,
    referenceDate: REF_DATE,
  });
  assert.strictEqual(res89.patientType, 'old_active');
  assert.strictEqual(res89.requiresIntake, false);

  console.log('  [PASS] Case 5 passed: Exact boundary 89d, 90d, and 91d accurately segregated');
}

// Additional Edge Cases: Multiple dates out of order
{
  console.log('Executing Edge Case: Multiple activity dates out of order...');
  const res = evaluateClinicalStatus({
    patientId: 'patient-multiple-activities',
    activityDates: [
      offsetDate(REF_DATE, -250), // 250d ago
      offsetDate(REF_DATE, -20),  // 20d ago (MOST RECENT)
      offsetDate(REF_DATE, -95),  // 95d ago
    ],
    todayIntake: null,
    referenceDate: REF_DATE,
  });

  assert.strictEqual(res.patientType, 'old_active');
  assert.strictEqual(res.daysSinceLastActivity, 20);
  assert.strictEqual(res.requiresIntake, false);
  console.log('  [PASS] Edge Case passed: Most recent activity selected correctly regardless of input order');
}

// -----------------------------------------------------------------------------
// PART 2: INTEGRATION TESTS (In-Memory SQLite DB & Drizzle ORM)
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: Database Integration Tests (In-Memory SQLite) ---');

const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = OFF');

sqlite.exec(`
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
    allergies TEXT,
    chronic_conditions TEXT,
    contraindications TEXT,
    notes TEXT,
    consent_signed INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE patient_intake_forms (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    visit_id TEXT,
    consultation_booking_id TEXT,
    doctor_id TEXT,
    receptionist_id TEXT,
    receptionist_name TEXT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    age_years INTEGER,
    phone TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'male',
    occupation TEXT,
    address TEXT,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    blood_sugar TEXT,
    has_diabetes INTEGER NOT NULL DEFAULT 0,
    weight_kg TEXT,
    chief_complaint TEXT,
    problem_duration TEXT,
    seen_doctor_before INTEGER NOT NULL DEFAULT 0,
    previous_doctor_details TEXT,
    has_previous_reports INTEGER NOT NULL DEFAULT 0,
    previous_report_names TEXT,
    takes_regular_medication INTEGER NOT NULL DEFAULT 0,
    regular_medication_details TEXT,
    has_drug_allergies INTEGER NOT NULL DEFAULT 0,
    drug_allergy_details TEXT,
    referral_source TEXT,
    referral_other_details TEXT,
    special_notes TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    forwarded_to_cashier_at TEXT,
    billed_at TEXT,
    queued_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE consultation_bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT NOT NULL UNIQUE,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    doctor_id TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    told_time TEXT,
    visit_type TEXT NOT NULL DEFAULT 'new_consultation',
    fee_paisa INTEGER NOT NULL DEFAULT 50000,
    serial_number INTEGER,
    status TEXT NOT NULL DEFAULT 'booked',
    checked_in_at TEXT,
    punctuality_status TEXT,
    delay_minutes INTEGER,
    in_queue_at TEXT,
    queued_by TEXT,
    serial_id TEXT,
    visit_id TEXT,
    cancelled_at TEXT,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    notes TEXT,
    booked_by TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE therapy_slot_bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT NOT NULL UNIQUE,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    booking_date TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    slot_hour TEXT NOT NULL,
    told_time TEXT,
    patient_gender TEXT NOT NULL,
    capacity_type TEXT NOT NULL DEFAULT 'regular',
    status TEXT NOT NULL DEFAULT 'booked',
    approval_status TEXT,
    approved_by TEXT,
    approved_at TEXT,
    rejected_by TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    checked_in_at TEXT,
    punctuality_status TEXT,
    delay_minutes INTEGER,
    notes TEXT,
    booked_by TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    doctor_id TEXT,
    token_number INTEGER NOT NULL,
    visit_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'checked_in',
    priority TEXT NOT NULL DEFAULT 'normal',
    current_location TEXT DEFAULT 'reception',
    room_id TEXT,
    checked_in_at TEXT,
    checked_out_at TEXT,
    told_time TEXT,
    punctuality_status TEXT,
    delay_minutes INTEGER,
    therapy_booking_id TEXT,
    consultation_booking_id TEXT,
    discharge_notes TEXT,
    next_follow_up_date TEXT,
    cleared_by TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE patient_assessment_files (
    id TEXT PRIMARY KEY,
    file_number TEXT NOT NULL UNIQUE,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    doctor_id TEXT,
    doctor_name TEXT,
    visit_id TEXT,
    assessment_date TEXT NOT NULL,
    name TEXT NOT NULL,
    age TEXT,
    gender TEXT,
    id_no TEXT,
    occupation TEXT,
    address TEXT,
    mobile TEXT,
    pain_areas TEXT,
    pain_area_others TEXT,
    side TEXT,
    duration TEXT,
    pain_types TEXT,
    vas_score INTEGER DEFAULT 0,
    pain_increases_with TEXT,
    pain_reduces_with TEXT,
    injury_accident TEXT DEFAULT 'no',
    injury_details TEXT,
    posture_advice TEXT DEFAULT 'no',
    posture_habits TEXT,
    surgery_history TEXT DEFAULT 'no',
    surgery_details TEXT,
    previous_treatment TEXT,
    previous_treatment_details TEXT,
    functional_limitations TEXT,
    functional_notes TEXT,
    rom TEXT DEFAULT 'Normal',
    muscle_spasm TEXT DEFAULT 'no',
    tenderness TEXT DEFAULT 'no',
    swelling TEXT DEFAULT 'no',
    physical_exam_notes TEXT,
    diagnosis TEXT,
    treatment_plans TEXT,
    treatment_plan_notes TEXT,
    prescribed_sessions INTEGER,
    exercise_explained TEXT DEFAULT 'no',
    home_posture_advice TEXT DEFAULT 'no',
    home_advice_notes TEXT,
    pain_scale_after_treatment INTEGER,
    improvement TEXT,
    therapist_signature TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const db = drizzle(sqlite, { schema });

async function runIntegrationTests() {
  const DB_REF_DATE = '2026-10-26';

  // Integration Test 1: Brand New Patient in DB (0 intakes, 0 consultations, 0 therapies)
  console.log('Running Integration Test 1: Brand New Patient in Database...');
  const brandNewId = 'p-db-brand-new-001';
  sqlite.prepare(`
    INSERT INTO patients (id, mrn, name_en, phone, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(brandNewId, 'HPC-2026-00101', 'Anika Tabassum', '+8801711000101', 'female', DB_REF_DATE, DB_REF_DATE);

  const status1 = await getPatientClinicalStatus(db as any, brandNewId, DB_REF_DATE);
  assert.strictEqual(status1.patientType, 'brand_new');
  assert.strictEqual(status1.requiresIntake, true);
  assert.strictEqual(status1.isNewPatient, true);
  assert.strictEqual(status1.isLapsed, false);
  assert.strictEqual(status1.lastActivityDate, null);
  assert.strictEqual(status1.intakeCompletedToday, false);
  console.log('  [PASS] Integration Test 1 passed: Database brand new patient verified');

  // Integration Test 2: Old Active Patient in DB (Activity 15 days ago)
  console.log('Running Integration Test 2: Old Active Patient in Database...');
  const activeId = 'p-db-active-002';
  const activeDate = offsetDate(DB_REF_DATE, -15);
  sqlite.prepare(`
    INSERT INTO patients (id, mrn, name_en, phone, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(activeId, 'HPC-2026-00102', 'Rafiqul Islam', '+8801711000102', 'male', activeDate, activeDate);

  sqlite.prepare(`
    INSERT INTO consultation_bookings (id, booking_number, patient_id, doctor_id, booking_date, slot_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), 'CB-26-000102', activeId, 'doc-001', activeDate, '10:00 AM', 'completed');

  const status2 = await getPatientClinicalStatus(db as any, activeId, DB_REF_DATE);
  assert.strictEqual(status2.patientType, 'old_active');
  assert.strictEqual(status2.requiresIntake, false);
  assert.strictEqual(status2.isNewPatient, false);
  assert.strictEqual(status2.isLapsed, false);
  assert.strictEqual(status2.daysSinceLastActivity, 15);
  assert.strictEqual(status2.lastActivityDate, activeDate);
  console.log('  [PASS] Integration Test 2 passed: Database old active patient verified');

  // Integration Test 3: Lapsed Patient in DB (100 days ago > 90 days)
  console.log('Running Integration Test 3: Lapsed Patient in Database (> 90 days)...');
  const lapsedId = 'p-db-lapsed-003';
  const lapsedDate = offsetDate(DB_REF_DATE, -100);
  sqlite.prepare(`
    INSERT INTO patients (id, mrn, name_en, phone, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(lapsedId, 'HPC-2026-00103', 'Kamal Hossain', '+8801711000103', 'male', lapsedDate, lapsedDate);

  sqlite.prepare(`
    INSERT INTO therapy_slot_bookings (id, booking_number, patient_id, booking_date, day_of_week, slot_hour, patient_gender, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), 'TB-26-000103', lapsedId, lapsedDate, 'Sunday', '10:00 AM - 11:00 AM', 'male', 'completed');

  const status3 = await getPatientClinicalStatus(db as any, lapsedId, DB_REF_DATE);
  assert.strictEqual(status3.patientType, 'lapsed_reintake');
  assert.strictEqual(status3.requiresIntake, true);
  assert.strictEqual(status3.isNewPatient, true);
  assert.strictEqual(status3.isLapsed, true);
  assert.strictEqual(status3.daysSinceLastActivity, 100);
  assert.strictEqual(status3.lastActivityDate, lapsedDate);
  assert.strictEqual(status3.intakeCompletedToday, false);
  console.log('  [PASS] Integration Test 3 passed: Database lapsed patient (>90d) verified');

  // Integration Test 4: Lapsed Patient who completed Intake Today
  console.log('Running Integration Test 4: Lapsed Patient with Intake Completed Today...');
  const todayIntakeId = 'intake-today-db-104';
  sqlite.prepare(`
    INSERT INTO patient_intake_forms (id, patient_id, date, name, phone, gender, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(todayIntakeId, lapsedId, DB_REF_DATE, 'Kamal Hossain', '+8801711000103', 'male', 'submitted', DB_REF_DATE);

  const status4 = await getPatientClinicalStatus(db as any, lapsedId, DB_REF_DATE);
  assert.strictEqual(status4.patientType, 'lapsed_reintake');
  assert.strictEqual(status4.isLapsed, true);
  assert.strictEqual(status4.intakeCompletedToday, true);
  assert.strictEqual(status4.todayIntakeId, todayIntakeId);
  assert.strictEqual(status4.requiresIntake, false); // Intake fulfilled today
  console.log('  [PASS] Integration Test 4 passed: Today completed intake verified in DB');

  // Integration Test 5: Exact Boundary 90 days vs 91 days in Database
  console.log('Running Integration Test 5: Exact Database Boundary (90 days vs 91 days)...');
  const boundary90Id = 'p-db-boundary-90';
  const date90 = offsetDate(DB_REF_DATE, -90);
  sqlite.prepare(`
    INSERT INTO patients (id, mrn, name_en, phone, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(boundary90Id, 'HPC-2026-00104', 'Boundary 90 User', '+8801711000104', 'female', date90, date90);

  sqlite.prepare(`
    INSERT INTO visits (id, patient_id, token_number, visit_date, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), boundary90Id, 1, date90, 'completed');

  const status90 = await getPatientClinicalStatus(db as any, boundary90Id, DB_REF_DATE);
  assert.strictEqual(status90.daysSinceLastActivity, 90);
  assert.strictEqual(status90.patientType, 'old_active');
  assert.strictEqual(status90.requiresIntake, false);
  assert.strictEqual(status90.isLapsed, false);

  const boundary91Id = 'p-db-boundary-91';
  const date91 = offsetDate(DB_REF_DATE, -91);
  sqlite.prepare(`
    INSERT INTO patients (id, mrn, name_en, phone, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(boundary91Id, 'HPC-2026-00105', 'Boundary 91 User', '+8801711000105', 'female', date91, date91);

  sqlite.prepare(`
    INSERT INTO visits (id, patient_id, token_number, visit_date, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), boundary91Id, 2, date91, 'completed');

  const status91 = await getPatientClinicalStatus(db as any, boundary91Id, DB_REF_DATE);
  assert.strictEqual(status91.daysSinceLastActivity, 91);
  assert.strictEqual(status91.patientType, 'lapsed_reintake');
  assert.strictEqual(status91.requiresIntake, true);
  assert.strictEqual(status91.isLapsed, true);
  console.log('  [PASS] Integration Test 5 passed: DB Boundary 90d vs 91d accurately distinguished');

  // Integration Test 6: Non-existent patient throws NotFoundException
  console.log('Running Integration Test 6: Non-existent patient error handling...');
  await assert.rejects(
    async () => {
      await getPatientClinicalStatus(db as any, 'non-existent-id', DB_REF_DATE);
    },
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      return true;
    },
  );
  console.log('  [PASS] Integration Test 6 passed: NotFoundException handled gracefully');

  sqlite.close();
  console.log('\n================================================================');
  console.log('ALL 3-TIER PATIENT CLINICAL STATUS TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
  process.exit(0);
}

runIntegrationTests().catch((err) => {
  console.error('\nFATAL: Clinical Status Test Suite Failed:', err);
  process.exit(1);
});
