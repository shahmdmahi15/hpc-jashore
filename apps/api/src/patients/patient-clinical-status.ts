// apps/api/src/patients/patient-clinical-status.ts
import { NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import {
  consultationBookings,
  patientAssessmentFiles,
  patientIntakeForms,
  patients,
  therapySlotBookings,
  visits,
} from '../db/schema';

export const LAPSED_THRESHOLD_DAYS = 90;

export type PatientClinicalType = 'brand_new' | 'old_active' | 'lapsed_reintake';

export interface PatientClinicalStatus {
  patientId: string;
  patientType: PatientClinicalType;
  requiresIntake: boolean;
  isNewPatient: boolean;
  isLapsed: boolean;
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  intakeCompletedToday: boolean;
  todayIntakeId: string | null;
  summaryEn: string;
  summaryBn: string;
}

/**
 * Calculates the exact number of calendar days between reference date and past date.
 * Uses UTC midnight normalization to eliminate timezone / DST shifts.
 */
export function calculateDaysBetween(referenceDateStr: string, pastDateStr: string): number {
  const ref = new Date(referenceDateStr.slice(0, 10) + 'T00:00:00Z');
  const past = new Date(pastDateStr.slice(0, 10) + 'T00:00:00Z');
  const diffMs = ref.getTime() - past.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds or subtracts days from a date string (YYYY-MM-DD), returning YYYY-MM-DD.
 */
export function offsetDate(baseDateStr: string, offsetDays: number): string {
  const d = new Date(baseDateStr.slice(0, 10) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Pure evaluation engine for Patient Clinical Status (3-Tier Recognition):
 * 1. 'brand_new': Registered, 0 prior intakes, 0 consultations, 0 therapies.
 * 2. 'old_active': Last activity <= 90 days ago.
 * 3. 'lapsed_reintake': Last activity > 90 days ago (> 3 months).
 */
export function evaluateClinicalStatus(params: {
  patientId: string;
  activityDates: string[];
  todayIntake?: { id: string; date: string } | null;
  referenceDate?: string;
}): PatientClinicalStatus {
  const todayStr = params.referenceDate || new Date().toISOString().slice(0, 10);
  const todayIntake = params.todayIntake ?? null;
  const intakeCompletedToday = Boolean(todayIntake);
  const todayIntakeId = todayIntake?.id ?? null;

  // Filter and sort historical activity dates (strictly prior to reference date)
  const validPastDates = (params.activityDates || [])
    .filter((d): d is string => typeof d === 'string' && d.trim().length >= 10)
    .map((d) => d.slice(0, 10))
    .filter((d) => d < todayStr)
    .sort((a, b) => b.localeCompare(a)); // Descending order: index 0 is most recent

  // Tier 1: Brand New Patient (no prior clinical activity recorded)
  if (validPastDates.length === 0) {
    return {
      patientId: params.patientId,
      patientType: 'brand_new',
      requiresIntake: !intakeCompletedToday,
      isNewPatient: true,
      isLapsed: false,
      lastActivityDate: null,
      daysSinceLastActivity: null,
      intakeCompletedToday,
      todayIntakeId,
      summaryEn: 'Brand new patient — Initial clinical intake form required',
      summaryBn: 'নতুন রোগী — প্রাথমিক তথ্য ও রিসেপশন ফরম পূরণ আবশ্যক',
    };
  }

  const mostRecentDate = validPastDates[0];
  const daysSince = calculateDaysBetween(todayStr, mostRecentDate);

  // Tier 2: Old Active Patient (last activity <= 90 days)
  if (daysSince <= LAPSED_THRESHOLD_DAYS) {
    return {
      patientId: params.patientId,
      patientType: 'old_active',
      requiresIntake: false,
      isNewPatient: false,
      isLapsed: false,
      lastActivityDate: mostRecentDate,
      daysSinceLastActivity: daysSince,
      intakeCompletedToday,
      todayIntakeId,
      summaryEn: `Old active patient (${daysSince}d ago) — Direct consultation/therapy`,
      summaryBn: `পুরাতন সক্রিয় রোগী (${daysSince} দিন আগে) — সরাসরি সেবা গ্রহণ করতে পারেন`,
    };
  }

  // Tier 3: Lapsed Patient (> 90 days ago / > 3 months)
  return {
    patientId: params.patientId,
    patientType: 'lapsed_reintake',
    requiresIntake: !intakeCompletedToday,
    isNewPatient: true, // Classified as new patient clinically: mandatory re-intake
    isLapsed: true,
    lastActivityDate: mostRecentDate,
    daysSinceLastActivity: daysSince,
    intakeCompletedToday,
    todayIntakeId,
    summaryEn: intakeCompletedToday
      ? `Lapsed patient (${daysSince}d ago) — Today's intake form completed`
      : `Lapsed patient (${daysSince}d ago > 90d) — Mandatory re-intake assessment required`,
    summaryBn: intakeCompletedToday
      ? `অনুপস্থিত রোগী (${daysSince} দিন আগে) — আজকের রি-ইনটেক ফরম পূরণ সম্পন্ন`
      : `অনুপস্থিত রোগী (${daysSince} দিন আগে) — ৩ মাসের বেশি বিরতির কারণে পুনরায় রি-ইনটেক আবশ্যক`,
  };
}

/**
 * Resolves the 3-Tier Clinical Status of a patient from the database.
 */
export async function getPatientClinicalStatus(
  db: Db,
  patientId: string,
  referenceDateStr?: string,
): Promise<PatientClinicalStatus> {
  const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);

  // 1. Verify Patient Exists
  const patientRows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);

  if (!patientRows[0]) {
    throw new NotFoundException(`Patient #${patientId} not found`);
  }

  // 2. Check if an intake form has already been completed today
  const todayIntakeRows = await db
    .select({ id: patientIntakeForms.id, date: patientIntakeForms.date })
    .from(patientIntakeForms)
    .where(
      and(
        eq(patientIntakeForms.patientId, patientId),
        or(
          eq(patientIntakeForms.date, todayStr),
          sql`${patientIntakeForms.createdAt} LIKE ${todayStr + '%'}`,
        ),
      ),
    )
    .orderBy(desc(patientIntakeForms.createdAt))
    .limit(1);

  const todayIntake = todayIntakeRows[0] || null;

  // 3. Collect historical clinical activity dates across all relevant clinical tables
  const activityDates: string[] = [];

  // 3a. Historical Intake Forms
  const intakeRows = await db
    .select({ date: patientIntakeForms.date })
    .from(patientIntakeForms)
    .where(and(eq(patientIntakeForms.patientId, patientId), sql`${patientIntakeForms.date} < ${todayStr}`));
  for (const r of intakeRows) {
    if (r.date) activityDates.push(r.date);
  }

  // 3b. Consultation Bookings
  const consultRows = await db
    .select({ date: consultationBookings.bookingDate })
    .from(consultationBookings)
    .where(and(eq(consultationBookings.patientId, patientId), sql`${consultationBookings.bookingDate} < ${todayStr}`));
  for (const r of consultRows) {
    if (r.date) activityDates.push(r.date);
  }

  // 3c. Therapy Bookings
  const therapyRows = await db
    .select({ date: therapySlotBookings.bookingDate })
    .from(therapySlotBookings)
    .where(and(eq(therapySlotBookings.patientId, patientId), sql`${therapySlotBookings.bookingDate} < ${todayStr}`));
  for (const r of therapyRows) {
    if (r.date) activityDates.push(r.date);
  }

  // 3d. Visits
  const visitRows = await db
    .select({ date: visits.visitDate })
    .from(visits)
    .where(and(eq(visits.patientId, patientId), sql`${visits.visitDate} < ${todayStr}`));
  for (const r of visitRows) {
    if (r.date) activityDates.push(r.date);
  }

  // 3e. Physiotherapy Assessment Files
  const assessmentRows = await db
    .select({ date: patientAssessmentFiles.assessmentDate })
    .from(patientAssessmentFiles)
    .where(and(eq(patientAssessmentFiles.patientId, patientId), sql`${patientAssessmentFiles.assessmentDate} < ${todayStr}`));
  for (const r of assessmentRows) {
    if (r.date) activityDates.push(r.date);
  }

  return evaluateClinicalStatus({
    patientId,
    activityDates,
    todayIntake,
    referenceDate: todayStr,
  });
}
