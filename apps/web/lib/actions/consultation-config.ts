// apps/web/lib/actions/consultation-config.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface DoctorConfigRecord {
  id: string;
  userId: string;
  displayName: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'doctor';
  consultationFeePaisa: number;
  consultationFeeTaka: number;
  followUpFeePaisa: number;
  followUpFeeTaka: number;
  reportFeePaisa: number;
  reportFeeTaka: number;
  chamberRoomId: string | null;
  chamberRoomNumber?: string | null;
  chamberName?: string | null;
  chamberRoom?: {
    id: string;
    roomNumber: string;
    name: string;
    type: string;
    status: string;
  } | null;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDoctorInput {
  userId?: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  consultationFeeTaka?: number;
  followUpFeeTaka?: number;
  reportFeeTaka?: number;
  chamberRoomId?: string | null;
}

export interface UpdateDoctorConfigInput {
  displayName?: string;
  fullName?: string;
  phone?: string;
  consultationFeeTaka?: number;
  followUpFeeTaka?: number;
  reportFeeTaka?: number;
  chamberRoomId?: string | null;
  isActive?: boolean;
}

export async function listDoctorsAction(): Promise<{
  success: boolean;
  data?: DoctorConfigRecord[];
  error?: string;
}> {
  try {
    const res = await serverFetch<DoctorConfigRecord[]>('/staff/doctors');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list doctors' };
  }
}

export async function getDoctorAction(id: string): Promise<{
  success: boolean;
  data?: DoctorConfigRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<DoctorConfigRecord>(`/staff/doctors/${encodeURIComponent(id)}`);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get doctor record' };
  }
}

export async function createDoctorAction(input: CreateDoctorInput): Promise<{
  success: boolean;
  data?: DoctorConfigRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<DoctorConfigRecord>('/staff/doctors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create doctor' };
  }
}

export async function updateDoctorConfigAction(
  id: string,
  input: UpdateDoctorConfigInput,
): Promise<{
  success: boolean;
  data?: DoctorConfigRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<DoctorConfigRecord>(`/staff/doctors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update doctor consultation config' };
  }
}
