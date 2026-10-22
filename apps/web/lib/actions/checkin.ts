// apps/web/lib/actions/checkin.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';
import type { PatientRecord } from './patients';

export type PunctualityStatus = 'on_time' | 'moderate_delay' | 'critical_delay';

export interface CheckInStats {
  totalCheckedIn: number;
  totalBooked: number;
  attendedBooked: number;
  onTimeCount: number;
  moderateDelayCount: number;
  criticalDelayCount: number;
}

export interface TherapyBookingItem {
  id: string;
  patientId: string;
  bookingDate: string;
  dayOfWeek: string;
  slotHour: string;
  slotConfigId?: string | null;
  toldTime?: string | null;
  status: 'booked' | 'attended' | 'cancelled' | 'no_show';
  notes?: string | null;
  bookedBy?: string | null;
  checkedInAt?: string | null;
  punctualityStatus?: PunctualityStatus | null;
  delayMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  patient: PatientRecord;
}

export interface LiveQueuePatient {
  visitId: string;
  tokenNumber: number;
  patientId: string;
  mrn: string;
  patientNameEn: string;
  patientNameBn?: string | null;
  phone: string;
  gender: 'male' | 'female';
  priority: 'normal' | 'emergency' | 'vip';
  status: string;
  currentLocation: string;
  toldTime?: string | null;
  punctualityStatus?: PunctualityStatus | null;
  delayMinutes?: number | null;
  checkedInAt: string;
}

export interface RecentCheckInVisit {
  id: string;
  patientId: string;
  doctorId?: string | null;
  tokenNumber: number;
  visitDate: string;
  status: string;
  priority: 'normal' | 'emergency' | 'vip';
  currentLocation: string;
  toldTime?: string | null;
  punctualityStatus?: PunctualityStatus | null;
  delayMinutes?: number | null;
  therapyBookingId?: string | null;
  notes?: string | null;
  checkedInAt: string;
  createdAt: string;
  patient: PatientRecord;
  doctor?: { id: string; fullName: string } | null;
}

export interface CheckInOverviewResult {
  date: string;
  stats: CheckInStats;
  todayBookings: TherapyBookingItem[];
  liveTherapyQueue: LiveQueuePatient[];
  recentCheckIns: RecentCheckInVisit[];
}

export interface CheckInPatientPayload {
  patientId: string;
  doctorId?: string;
  priority?: 'normal' | 'emergency' | 'vip';
  notes?: string;
  destination?: 'therapy' | 'consultation';
  therapyBookingId?: string;
  toldTime?: string;
}

export interface CheckInResponse {
  visit: RecentCheckInVisit;
  patient: PatientRecord;
  tokenSlip: {
    tokenNumber: number;
    serialNumber?: number | null;
    date: string;
    time: string;
    destination?: string;
    toldTime?: string | null;
    punctualityStatus?: PunctualityStatus | null;
    delayMinutes?: number | null;
    clinicNameBn: string;
    clinicNameEn: string;
  };
}

/**
 * Fetch the complete check-in overview including today's bookings, live therapy queue,
 * punctuality markers, and recent check-ins.
 */
export async function getCheckInOverviewAction(): Promise<CheckInOverviewResult> {
  return serverFetch<CheckInOverviewResult>('/visits/checkin/overview');
}

/**
 * Check in a patient, compare told time with arrival time, set punctuality markers,
 * route directly to therapy queue or doctor queue, and emit realtime updates.
 */
export async function checkInPatientAction(
  payload: CheckInPatientPayload,
): Promise<CheckInResponse> {
  const result = await serverFetch<CheckInResponse>('/visits/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  revalidatePath('/admin');
  revalidatePath('/receptionist');
  revalidatePath('/doctor');
  revalidatePath('/cashier');
  revalidatePath('/handler');
  revalidatePath('/tv');

  return result;
}
