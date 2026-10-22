// apps/web/lib/actions/therapy-slots.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export type DayOfWeek =
  | 'Saturday'
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday';

export type SlotHour =
  | '0:00 AM - 1:00 AM'
  | '1:00 AM - 2:00 AM'
  | '2:00 AM - 3:00 AM'
  | '3:00 AM - 4:00 AM'
  | '4:00 AM - 5:00 AM'
  | '5:00 AM - 6:00 AM'
  | '6:00 AM - 7:00 AM'
  | '7:00 AM - 8:00 AM'
  | '8:00 AM - 9:00 AM'
  | '9:00 AM - 10:00 AM'
  | '10:00 AM - 11:00 AM'
  | '11:00 AM - 12:00 PM'
  | '12:00 PM - 1:00 PM'
  | '1:00 PM - 2:00 PM'
  | '2:00 PM - 3:00 PM'
  | '3:00 PM - 4:00 PM'
  | '4:00 PM - 5:00 PM'
  | '5:00 PM - 6:00 PM'
  | '6:00 PM - 7:00 PM'
  | '7:00 PM - 8:00 PM'
  | '8:00 PM - 9:00 PM'
  | '9:00 PM - 10:00 PM'
  | '10:00 PM - 11:00 PM'
  | '11:00 PM - 12:00 AM';

export interface TherapySlotRecord {
  id: string;
  day: DayOfWeek;
  slotHour: SlotHour;
  slotOrder: number;
  slotMaleRegularCapacity: number;
  slotFemaleRegularCapacity: number;
  slotMaleExtraCapacity: number;
  slotFemaleExtraCapacity: number;
  isActive: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TherapySlotStats {
  totalSlots: number;
  activeSlots: number;
  totalMaleRegularCapacity: number;
  totalFemaleRegularCapacity: number;
  totalMaleExtraCapacity: number;
  totalFemaleExtraCapacity: number;
  totalRegularCapacity: number;
  totalExtraCapacity: number;
  grandTotalCapacity: number;
}

export interface TherapySlotsListResult {
  items: TherapySlotRecord[];
  stats: TherapySlotStats;
}

export interface UpdateTherapySlotInput {
  slotMaleRegularCapacity?: number;
  slotFemaleRegularCapacity?: number;
  slotMaleExtraCapacity?: number;
  slotFemaleExtraCapacity?: number;
  isActive?: number;
  notes?: string;
}

export async function listTherapySlotsAction(params?: {
  day?: string;
  isActive?: boolean | number | string;
}): Promise<{
  success: boolean;
  data?: TherapySlotsListResult;
  error?: string;
}> {
  try {
    const queryParts: string[] = [];
    if (params?.day && params.day !== 'all') {
      queryParts.push(`day=${encodeURIComponent(params.day)}`);
    }
    if (params?.isActive !== undefined && params.isActive !== 'all') {
      queryParts.push(`isActive=${encodeURIComponent(String(params.isActive))}`);
    }

    const queryString = queryParts.join('&');
    const path = `/therapy-slots${queryString ? `?${queryString}` : ''}`;

    const res = await serverFetch<TherapySlotsListResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list therapy slots' };
  }
}

export async function updateTherapySlotAction(
  id: string,
  dto: UpdateTherapySlotInput,
): Promise<{
  success: boolean;
  data?: TherapySlotRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<TherapySlotRecord>(
      `/therapy-slots/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(dto),
      },
    );

    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update therapy slot' };
  }
}

export async function bulkUpdateTherapySlotsAction(
  slots: Array<{
    id: string;
    slotMaleRegularCapacity?: number;
    slotFemaleRegularCapacity?: number;
    slotMaleExtraCapacity?: number;
    slotFemaleExtraCapacity?: number;
    isActive?: number;
    notes?: string;
  }>,
): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const res = await serverFetch<{ success: boolean; count: number }>(
      '/therapy-slots/bulk-update',
      {
        method: 'POST',
        body: JSON.stringify({ slots }),
      },
    );

    revalidatePath('/admin');
    return { success: true, count: res.count };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to bulk update slots' };
  }
}

export async function copyDayScheduleAction(
  fromDay: DayOfWeek,
  toDays: DayOfWeek[],
): Promise<{
  success: boolean;
  updatedCount?: number;
  error?: string;
}> {
  try {
    const res = await serverFetch<{ success: boolean; updatedCount: number }>(
      '/therapy-slots/copy-day',
      {
        method: 'POST',
        body: JSON.stringify({ fromDay, toDays }),
      },
    );

    revalidatePath('/admin');
    return { success: true, updatedCount: res.updatedCount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to copy day schedule' };
  }
}

// --- Therapy Bookings Types & Actions ----------------------------------------

export type TherapyBookingStatus =
  | 'booked'
  | 'confirmed'
  | 'attended'
  | 'completed'
  | 'cancelled';

export interface TherapySlotBookingRecord {
  id: string;
  bookingNumber: string;
  patientId: string;
  bookingDate: string;
  dayOfWeek: DayOfWeek;
  slotHour: SlotHour;
  toldTime?: string | null;
  patientGender: 'male' | 'female';
  capacityType: 'regular' | 'extra';
  status: TherapyBookingStatus;
  notes?: string | null;
  bookedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    nameEn: string;
    nameBn?: string | null;
    phone: string;
    email?: string | null;
    gender: 'male' | 'female';
    ageYears?: number | null;
    bloodGroup?: string | null;
  };
  bookedByUser?: {
    id: string;
    displayName: string;
    role: string;
  } | null;
}

export interface TherapySlotAvailabilityItem {
  id: string;
  day: DayOfWeek;
  slotHour: SlotHour;
  slotOrder: number;
  isActive: number;
  notes?: string | null;
  maleRegularCapacity: number;
  maleRegularBooked: number;
  maleRegularRemaining: number;
  maleExtraCapacity: number;
  maleExtraBooked: number;
  maleExtraRemaining: number;
  maleTotalAvailable: number;
  isMaleFull: boolean;
  femaleRegularCapacity: number;
  femaleRegularBooked: number;
  femaleRegularRemaining: number;
  femaleExtraCapacity: number;
  femaleExtraBooked: number;
  femaleExtraRemaining: number;
  femaleTotalAvailable: number;
  isFemaleFull: boolean;
  totalSlotBooked: number;
  totalSlotCapacity: number;
  totalSlotAvailable: number;
  isSlotFull: boolean;
  isOpen: boolean;
}

export interface TherapySlotAvailabilityResult {
  date: string;
  dayOfWeek: DayOfWeek;
  stats: {
    totalDayCapacity: number;
    totalDayRegularCapacity: number;
    totalDayExtraCapacity: number;
    totalDayBooked: number;
    totalMaleBooked: number;
    totalFemaleBooked: number;
    activeSlotsCount: number;
    utilizationPercent: number;
  };
  slots: TherapySlotAvailabilityItem[];
}

export interface TherapyBookingsStats {
  total: number;
  booked: number;
  confirmed: number;
  attended: number;
  completed: number;
  cancelled: number;
}

export interface PagedTherapyBookingsResult {
  items: TherapySlotBookingRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: TherapyBookingsStats;
}

export async function getTherapySlotAvailabilityAction(
  date: string,
): Promise<{
  success: boolean;
  data?: TherapySlotAvailabilityResult;
  error?: string;
}> {
  try {
    const res = await serverFetch<TherapySlotAvailabilityResult>(
      `/therapy-slots/availability?date=${encodeURIComponent(date)}`,
    );
    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch therapy slot availability',
    };
  }
}

export async function listTherapyBookingsAction(params: {
  date?: string;
  patientId?: string;
  status?: string;
  slotHour?: string;
  capacityType?: 'regular' | 'extra';
  query?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: PagedTherapyBookingsResult;
  error?: string;
}> {
  try {
    const queryParts: string[] = [];
    if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
    if (params.patientId) queryParts.push(`patientId=${encodeURIComponent(params.patientId)}`);
    if (params.status && params.status !== 'all')
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.slotHour && params.slotHour !== 'all')
      queryParts.push(`slotHour=${encodeURIComponent(params.slotHour)}`);
    if (params.capacityType)
      queryParts.push(`capacityType=${encodeURIComponent(params.capacityType)}`);
    if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await serverFetch<PagedTherapyBookingsResult>(`/therapy-slots/bookings${qs}`);
    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to list therapy slot bookings',
    };
  }
}

export async function createTherapyBookingAction(payload: {
  patientId: string;
  bookingDate: string;
  slotHour: string;
  toldTime?: string;
  notes?: string;
  capacityType?: 'regular' | 'extra';
}): Promise<{
  success: boolean;
  data?: TherapySlotBookingRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<TherapySlotBookingRecord>('/therapy-slots/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to book therapy slot',
    };
  }
}

export async function updateTherapyBookingAction(
  id: string,
  payload: {
    status?: TherapyBookingStatus;
    toldTime?: string;
    notes?: string;
    slotHour?: string;
    bookingDate?: string;
  },
): Promise<{
  success: boolean;
  data?: TherapySlotBookingRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<TherapySlotBookingRecord>(
      `/therapy-slots/bookings/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update therapy slot booking',
    };
  }
}

export async function deleteTherapyBookingAction(
  id: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await serverFetch(`/therapy-slots/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to cancel therapy slot booking',
    };
  }
}

export async function restoreTherapyBookingAction(
  id: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await serverFetch(`/therapy-slots/bookings/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    });

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to restore therapy slot booking',
    };
  }
}
