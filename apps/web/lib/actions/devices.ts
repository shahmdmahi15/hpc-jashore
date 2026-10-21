'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface TvDeviceRecord {
  id: string;
  pairingCode: string;
  deviceName: string;
  location: string | null;
  department: 'ALL' | 'CONSULTATION' | 'THERAPY';
  theme: 'dark' | 'light';
  language: 'bn' | 'en';
  status: 'pending' | 'paired' | 'revoked';
  secretToken: string | null;
  ipAddress: string | null;
  appVersion: string | null;
  lastSeenAt: string | null;
  pairedAt: string | null;
  pairedBy: string | null;
  forceUpdate?: number;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
}

export async function listTvDevicesAction(): Promise<{
  success: boolean;
  data?: TvDeviceRecord[];
  error?: string;
}> {
  try {
    const data = await serverFetch<TvDeviceRecord[]>('/tv/devices');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list TV devices' };
  }
}

export async function pairTvDeviceAction(dto: {
  pairingCode: string;
  deviceName: string;
  department?: 'ALL' | 'CONSULTATION' | 'THERAPY';
  theme?: 'dark' | 'light';
  language?: 'bn' | 'en';
  location?: string;
}): Promise<{
  success: boolean;
  data?: TvDeviceRecord;
  error?: string;
}> {
  try {
    const data = await serverFetch<TvDeviceRecord>('/tv/pair', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to pair TV device' };
  }
}

export async function updateTvDeviceAction(
  id: string,
  dto: {
    deviceName?: string;
    department?: 'ALL' | 'CONSULTATION' | 'THERAPY';
    theme?: 'dark' | 'light';
    language?: 'bn' | 'en';
    location?: string;
    status?: 'pending' | 'paired' | 'revoked';
  },
): Promise<{
  success: boolean;
  data?: TvDeviceRecord;
  error?: string;
}> {
  try {
    const data = await serverFetch<TvDeviceRecord>(`/tv/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update TV device' };
  }
}

export async function revokeTvDeviceAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/tv/devices/${id}/revoke`, {
      method: 'POST',
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke TV device' };
  }
}

export async function deleteTvDeviceAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/tv/devices/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete TV device' };
  }
}

export async function forceUpdateTvDeviceAction(
  id: string,
  force: boolean = true,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await serverFetch<any>(`/tv/devices/${id}/force-update`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to trigger force update' };
  }
}
