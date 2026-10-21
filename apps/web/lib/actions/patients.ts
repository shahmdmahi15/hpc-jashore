// apps/web/lib/actions/patients.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface PatientRecord {
  id: string;
  mrn: string;
  nameEn: string;
  nameBn?: string | null;
  phone: string;
  email?: string | null;
  ageYears?: number | null;
  gender: 'male' | 'female';
  bloodGroup?: string | null;
  address?: string | null;
  occupation?: string | null;
  emergencyContact?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  contraindications?: string | null;
  notes?: string | null;
  consentSigned: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDetailRecord extends PatientRecord {
  visits?: Array<{
    id: string;
    tokenNumber: number;
    visitDate: string;
    status: string;
    priority: string;
    currentLocation: string;
    notes?: string | null;
    createdAt: string;
  }>;
  activePackageCredits?: Array<{
    id: string;
    modalityId: string;
    sessionsTotal: number;
    sessionsUsed: number;
    status: string;
  }>;
  outstandingDues?: Array<{
    id: string;
    amountPaisa: number;
    status: string;
    createdAt: string;
  }>;
}

export interface PagedPatientsResult {
  items: PatientRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePatientInput {
  nameEn: string;
  nameBn?: string;
  phone: string;
  email?: string;
  ageYears?: number;
  gender: 'male' | 'female';
  bloodGroup?: string;
  address?: string;
  occupation?: string;
  profession?: string;
  emergencyContact?: string;
  allergies?: string;
  chronicConditions?: string;
  contraindications?: string;
  notes?: string;
  consentSigned?: number;
}

export interface UpdatePatientInput {
  nameEn?: string;
  nameBn?: string;
  phone?: string;
  email?: string;
  ageYears?: number;
  gender?: 'male' | 'female';
  bloodGroup?: string;
  address?: string;
  occupation?: string;
  profession?: string;
  emergencyContact?: string;
  allergies?: string;
  chronicConditions?: string;
  contraindications?: string;
  notes?: string;
  consentSigned?: number;
}

export async function searchPatientsAction(params?: {
  query?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: PagedPatientsResult;
  error?: string;
}> {
  try {
    const q = params?.query ? encodeURIComponent(params.query.trim()) : '';
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 25;
    const path = `/patients?q=${q}&page=${page}&limit=${limit}`;

    const res = await serverFetch<PagedPatientsResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to search patients' };
  }
}

export async function getPatientDetailAction(id: string): Promise<{
  success: boolean;
  data?: PatientDetailRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<PatientDetailRecord>(`/patients/${encodeURIComponent(id)}`);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch patient details' };
  }
}

export async function createPatientAction(dto: CreatePatientInput): Promise<{
  success: boolean;
  data?: PatientRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<PatientRecord>('/patients', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    // Revalidate dashboard routes
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register patient' };
  }
}

export async function updatePatientAction(
  id: string,
  dto: UpdatePatientInput,
): Promise<{
  success: boolean;
  data?: PatientDetailRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<PatientDetailRecord>(`/patients/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update patient' };
  }
}

export async function deletePatientAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await serverFetch(`/patients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/doctor');
    revalidatePath('/cashier');
    revalidatePath('/handler');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete patient' };
  }
}
