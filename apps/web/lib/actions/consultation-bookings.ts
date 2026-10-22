// apps/web/lib/actions/consultation-bookings.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface ConsultationBookingRecord {
  id: string;
  bookingNumber: string;
  patientId: string;
  doctorId: string;
  bookingDate: string;
  slotTime: string;
  toldTime: string | null;
  visitType: 'new_consultation' | 'follow_up' | 'report_review';
  feePaisa: number;
  feeTaka: number;
  serialNumber: number | null;
  status: 'booked' | 'checked_in' | 'in_queue' | 'in_chamber' | 'completed' | 'cancelled';
  checkedInAt: string | null;
  punctualityStatus: 'on_time' | 'moderate_delay' | 'critical_delay' | null;
  delayMinutes: number | null;
  inQueueAt: string | null;
  queuedBy: string | null;
  serialId: string | null;
  visitId: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  notes: string | null;
  patient: {
    id: string;
    mrn: string;
    nameEn: string;
    nameBn: string | null;
    phone: string | null;
    gender: 'male' | 'female';
    ageYears: number | null;
  };
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    qualifications: string | null;
    chamberRoomNumber: string | null;
    chamberName: string | null;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationBookingsStats {
  totalBooked: number;
  checkedIn: number;
  inQueue: number;
  completed: number;
  cancelled: number;
}

export interface ListConsultationBookingsResult {
  items: ConsultationBookingRecord[];
  stats: ConsultationBookingsStats;
  date: string;
}

export interface DoctorSlotItem {
  slotTime: string;
  isAvailable: boolean;
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    patientName: string;
    mrn: string;
  } | null;
}

export interface DoctorSlotsResult {
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    qualifications: string | null;
    chamber: string;
    consultationFeeTaka: number;
    followUpFeeTaka: number;
    reportFeeTaka: number;
  };
  isAvailableDay: boolean;
  targetDate: string;
  dayOfWeek: string;
  dutyStartTime: string;
  dutyEndTime: string;
  dailyQuota: number;
  bookedCount: number;
  availableCount: number;
  slots: DoctorSlotItem[];
}

export interface CreateConsultationBookingInput {
  patientId: string;
  doctorId: string;
  bookingDate: string;
  slotTime: string;
  toldTime?: string;
  visitType?: 'new_consultation' | 'follow_up' | 'report_review';
  feeTaka?: number;
  feePaisa?: number;
  notes?: string;
}

export async function listConsultationBookingsAction(params?: {
  date?: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: ListConsultationBookingsResult;
  error?: string;
}> {
  try {
    const queryParts: string[] = [];
    if (params?.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
    if (params?.doctorId && params.doctorId !== 'all') queryParts.push(`doctorId=${encodeURIComponent(params.doctorId)}`);
    if (params?.patientId) queryParts.push(`patientId=${encodeURIComponent(params.patientId)}`);
    if (params?.status && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);

    const q = queryParts.join('&');
    const path = `/consultation-bookings${q ? `?${q}` : ''}`;
    const res = await serverFetch<ListConsultationBookingsResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list consultation bookings' };
  }
}

export async function getDoctorSlotsAction(
  doctorId: string,
  date: string,
): Promise<{
  success: boolean;
  data?: DoctorSlotsResult;
  error?: string;
}> {
  try {
    const path = `/consultation-bookings/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`;
    const res = await serverFetch<DoctorSlotsResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch doctor slots' };
  }
}

export async function createConsultationBookingAction(
  input: CreateConsultationBookingInput,
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await serverFetch<any>('/consultation-bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/cashier');
    revalidatePath('/doctor');
    revalidatePath('/handler');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create consultation booking' };
  }
}

export async function checkInConsultationBookingAction(
  bookingId: string,
  toldTimeOverride?: string,
  notes?: string,
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await serverFetch<any>(`/consultation-bookings/${encodeURIComponent(bookingId)}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ toldTime: toldTimeOverride, notes }),
    });
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/cashier');
    revalidatePath('/doctor');
    revalidatePath('/handler');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to check in consultation patient' };
  }
}

export async function sendBookingToDoctorQueueAction(
  bookingId: string,
  dto?: { chamberRoomId?: string; notes?: string },
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await serverFetch<any>(`/consultation-bookings/${encodeURIComponent(bookingId)}/queue`, {
      method: 'POST',
      body: JSON.stringify(dto || {}),
    });
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/cashier');
    revalidatePath('/doctor');
    revalidatePath('/handler');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send patient to doctor queue' };
  }
}

export async function cancelConsultationBookingAction(
  bookingId: string,
  reason?: string,
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await serverFetch<any>(`/consultation-bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/cashier');
    revalidatePath('/doctor');
    revalidatePath('/handler');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel consultation booking' };
  }
}
