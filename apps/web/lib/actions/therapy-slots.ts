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
