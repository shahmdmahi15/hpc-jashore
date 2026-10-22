// apps/web/lib/actions/checkout.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface CheckoutVisitRecord {
  visit: {
    id: string;
    tokenNumber: number;
    visitDate: string;
    status: string;
    priority: string;
    currentLocation: string;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    toldTime: string | null;
    punctualityStatus: string | null;
    delayMinutes: number | null;
    notes: string | null;
    dischargeNotes: string | null;
    nextFollowUpDate: string | null;
  };
  patient: {
    id: string;
    mrn: string;
    nameEn: string;
    nameBn: string | null;
    phone: string | null;
    gender: 'male' | 'female';
    ageYears: number | null;
    bloodGroup: string | null;
  };
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    chamber: string;
  } | null;
  financial: {
    totalBillTaka: number;
    paidTaka: number;
    dueTaka: number;
    hasDues: boolean;
    hasDraftBills: boolean;
    billCount: number;
  };
  clinical: {
    isConsultationDone: boolean;
    isTherapyDone: boolean;
    prescriptionIssued: boolean;
    prescriptionId: string | null;
    therapySessionsCount: number;
    followUpDate: string | null;
  };
  readiness: 'ready' | 'pending_dues' | 'in_service' | 'checked_out';
}

export interface CheckoutStats {
  totalCheckedInToday: number;
  currentlyInClinic: number;
  readyForCheckout: number;
  checkedOutToday: number;
  pendingDuesCount: number;
  totalDuesTaka: number;
}

export interface CheckoutListResult {
  items: CheckoutVisitRecord[];
  stats: CheckoutStats;
  date: string;
}

export interface ProcessCheckoutInput {
  notes?: string;
  allowWithDues?: boolean;
  dueReason?: string;
  nextFollowUpDate?: string;
}

export interface DepartureSlipData {
  clinic: {
    nameEn: string;
    nameBn: string;
    address: string;
    hotline: string;
  };
  slipNumber: string;
  visitId: string;
  tokenNumber: number;
  visitDate: string;
  entryTime: string | null;
  departureTime: string;
  patient: {
    mrn: string;
    nameEn: string;
    nameBn: string | null;
    phone: string | null;
    gender: string;
    ageYears: number | null;
  };
  doctor: {
    name: string;
    specialization: string | null;
    chamber: string | null;
  } | null;
  financial: {
    totalBillTaka: number;
    paidTaka: number;
    dueTaka: number;
    status: string;
  };
  nextFollowUpDate: string | null;
  dischargeNotes: string | null;
  prescriptionIssued: boolean;
}

export async function listCheckoutVisitsAction(params?: {
  search?: string;
  status?: string;
}): Promise<{
  success: boolean;
  data?: CheckoutListResult;
  error?: string;
}> {
  try {
    const queryParts: string[] = [];
    if (params?.search && params.search.trim()) {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params?.status && params.status !== 'all') {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }

    const q = queryParts.join('&');
    const path = `/visits/checkout/active${q ? `?${q}` : ''}`;
    const res = await serverFetch<CheckoutListResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list checkout patients' };
  }
}

export async function processCheckoutAction(
  visitId: string,
  input: ProcessCheckoutInput,
): Promise<{
  success: boolean;
  data?: { ok: boolean; checkedOutAt: string; departureSlip: DepartureSlipData };
  error?: string;
}> {
  try {
    const res = await serverFetch<{ ok: boolean; checkedOutAt: string; departureSlip: DepartureSlipData }>(
      `/visits/${encodeURIComponent(visitId)}/check-out`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    revalidatePath('/admin');
    revalidatePath('/receptionist');
    revalidatePath('/cashier');
    revalidatePath('/doctor');
    revalidatePath('/handler');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to process checkout' };
  }
}

export async function getDepartureSlipAction(visitId: string): Promise<{
  success: boolean;
  data?: DepartureSlipData;
  error?: string;
}> {
  try {
    const res = await serverFetch<DepartureSlipData>(`/visits/${encodeURIComponent(visitId)}/departure-slip`);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get departure slip' };
  }
}

export async function sendVisitToDoctorQueueAction(
  visitId: string,
  dto?: { chamberRoomId?: string; notes?: string },
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await serverFetch<any>(`/visits/${encodeURIComponent(visitId)}/send-to-doctor-queue`, {
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
    return { success: false, error: err?.message || 'Failed to send visit to doctor queue' };
  }
}
