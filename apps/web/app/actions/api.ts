// apps/web/app/actions/api.ts
// Direct server actions disabled for universal static export & Tauri compatibility

import { cookies } from 'next/headers';
import { serverFetch } from '../../lib/server-api';

/**
 * Generic Next.js Server Action to proxy all requests to the backend API.
 * All network calls execute strictly on the Next.js server.
 * No internal backend URLs or credentials are exposed to the client.
 */
export async function executeServerAction<T = any>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  explicitToken?: string,
): Promise<T> {
  const options: RequestInit = {
    method,
  };
  if (body !== undefined && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  return serverFetch<T>(path, options, explicitToken);
}

// -----------------------------------------------------------------------------
// Authentication Server Actions
// -----------------------------------------------------------------------------

export async function loginAction(credentials: { email: string; password: string }) {
  const data = await serverFetch<{
    accessToken: string;
    user: { id: string; email: string; role: string; displayName: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  const session = {
    accessToken: data.accessToken,
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role,
    displayName: data.user.displayName,
    staffId: undefined as string | undefined,
  };

  // Find associated staff profile if available
  try {
    const staffList = await serverFetch<any[]>('/staff', {}, data.accessToken);
    const matched = staffList.find(
      (s) => s.userId === session.userId || s.role === session.role,
    );
    if (matched) {
      session.staffId = matched.id;
    }
  } catch {
    // fallback gracefully
  }

  // Set secure HTTP-only cookies on the Next.js server for stateful sessions
  try {
    const cookieStore = await cookies();
    cookieStore.set('hpc_access_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set('hpc_session', JSON.stringify({
      userId: session.userId,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
      staffId: session.staffId,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // cookies may fail in non-standard execution contexts
  }

  return session;
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('hpc_access_token');
    cookieStore.delete('hpc_session');
  } catch {
    // ignore
  }
  return { success: true };
}

export async function registerAction(data: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  role?: string;
}) {
  return serverFetch<{ success: boolean; message: string; userId: string }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function forgotPasswordAction(email: string) {
  return serverFetch<{ success: boolean; message: string }>(
    '/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
  );
}

export async function resetPasswordAction(data: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return serverFetch<{ success: boolean; message: string }>(
    '/auth/reset-password',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function verifyEmailAction(data: { email: string; code: string }) {
  return serverFetch<{ success: boolean; message: string }>(
    '/auth/verify-email',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function resendVerificationAction(email: string) {
  return serverFetch<{ success: boolean; message: string }>(
    '/auth/resend-verification',
    { method: 'POST', body: JSON.stringify({ email }) },
  );
}

// -----------------------------------------------------------------------------
// Patients Server Actions
// -----------------------------------------------------------------------------

export async function getPatientsAction(search?: string, token?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return serverFetch<any[]>(`/patients${query}`, {}, token);
}

export async function createPatientAction(data: any, token?: string) {
  return serverFetch<any>(
    '/patients',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getPatientByIdAction(id: string, token?: string) {
  return serverFetch<any>(`/patients/${id}`, {}, token);
}

export async function getPatientHistoryAction(id: string, token?: string) {
  return serverFetch<any>(`/patients/${id}/history`, {}, token);
}

// -----------------------------------------------------------------------------
// Visits & Queue Server Actions
// -----------------------------------------------------------------------------

export async function getTodayVisitsAction(token?: string) {
  return serverFetch<any[]>('/visits/today', {}, token);
}

export async function checkInVisitAction(data: any, token?: string) {
  return serverFetch<any>(
    '/visits/check-in',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getDoctorQueueAction(doctorId: string, token?: string) {
  return serverFetch<any[]>(`/visits/doctor/${doctorId}/queue`, {}, token);
}

export async function callNextAction(doctorId: string, dto?: any, token?: string) {
  return serverFetch<any>(
    `/visits/doctor/${doctorId}/call-next`,
    { method: 'POST', body: JSON.stringify(dto || {}) },
    token,
  );
}

export async function callSerialAction(serialId: string, dto?: any, token?: string) {
  return serverFetch<any>(
    `/visits/serials/${serialId}/call`,
    { method: 'POST', body: JSON.stringify(dto || {}) },
    token,
  );
}

export async function completeSerialAction(serialId: string, token?: string) {
  return serverFetch<any>(
    `/visits/serials/${serialId}/complete`,
    { method: 'POST' },
    token,
  );
}

export async function skipSerialAction(serialId: string, token?: string) {
  return serverFetch<any>(
    `/visits/serials/${serialId}/skip`,
    { method: 'POST' },
    token,
  );
}

export async function getTvSnapshotAction() {
  return serverFetch<any>('/visits/tv/snapshot');
}

// -----------------------------------------------------------------------------
// Clinical Consultation & Prescription Server Actions
// -----------------------------------------------------------------------------

export async function getConsultationAction(visitId: string, token?: string) {
  return serverFetch<any>(`/clinical/consultations/${visitId}`, {}, token);
}

export async function saveConsultationAction(data: any, token?: string) {
  return serverFetch<any>(
    '/clinical/consultations',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getPrescriptionAction(visitId: string, token?: string) {
  return serverFetch<any>(`/clinical/prescriptions/${visitId}`, {}, token);
}

export async function createPrescriptionAction(data: any, token?: string) {
  return serverFetch<any>(
    '/clinical/prescriptions',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

// -----------------------------------------------------------------------------
// Therapy Hall & Bed Matrix Server Actions
// -----------------------------------------------------------------------------

export async function getTherapyBedsAction(token?: string) {
  return serverFetch<any[]>('/therapy/beds', {}, token);
}

export async function getTherapyMachinesAction(token?: string) {
  return serverFetch<any[]>('/therapy/machines', {}, token);
}

export async function getActiveTherapySessionsAction(token?: string) {
  return serverFetch<any[]>('/therapy/sessions/active', {}, token);
}

export async function startTherapySessionAction(data: any, token?: string) {
  return serverFetch<any>(
    '/therapy/sessions/start',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function completeTherapySessionAction(
  id: string,
  data: any,
  token?: string,
) {
  return serverFetch<any>(
    `/therapy/sessions/${id}/complete`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getTherapyPackagesAction(token?: string) {
  return serverFetch<any[]>('/therapy/packages', {}, token);
}

export async function purchaseTherapyPackageAction(data: any, token?: string) {
  return serverFetch<any>(
    '/therapy/packages/purchase',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getPatientCreditsAction(patientId: string, token?: string) {
  return serverFetch<any[]>(`/therapy/packages/patient/${patientId}`, {}, token);
}

// -----------------------------------------------------------------------------
// Billing, Cash Drawer & Payments Server Actions
// -----------------------------------------------------------------------------

export async function getDrawerStatusAction(cashierStaffId: string, token?: string) {
  return serverFetch<any>(`/billing/drawers/status/${cashierStaffId}`, {}, token);
}

export async function openDrawerAction(data: any, token?: string) {
  return serverFetch<any>(
    '/billing/drawers/open',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function closeDrawerAction(id: string, data: any, token?: string) {
  return serverFetch<any>(
    `/billing/drawers/${id}/close`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getBillsAction(token?: string) {
  return serverFetch<any[]>('/billing/bills', {}, token);
}

export async function createBillAction(data: any, token?: string) {
  return serverFetch<any>(
    '/billing/bills',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function recordPaymentAction(data: any, token?: string) {
  return serverFetch<any>(
    '/billing/payments',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getDuesAction(token?: string) {
  return serverFetch<any[]>('/billing/dues', {}, token);
}

// -----------------------------------------------------------------------------
// Inventory, Reports & Staff Server Actions
// -----------------------------------------------------------------------------

export async function getMedicinesAction(token?: string) {
  return serverFetch<any[]>('/inventory/medicines', {}, token);
}

export async function getBatchesAction(token?: string) {
  return serverFetch<any[]>('/inventory/batches', {}, token);
}

export async function getAlertsAction(token?: string) {
  return serverFetch<any>('/inventory/alerts', {}, token);
}

export async function getExpensesAction(token?: string) {
  return serverFetch<any[]>('/inventory/expenses', {}, token);
}

export async function createExpenseAction(data: any, token?: string) {
  return serverFetch<any>(
    '/inventory/expenses',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function getReportsTodaySummaryAction(token?: string) {
  return serverFetch<any>('/reports/today', {}, token);
}

export async function getReportsModalityStatsAction(token?: string) {
  return serverFetch<any[]>('/reports/modalities', {}, token);
}

export async function getReportsDoctorStatsAction(token?: string) {
  return serverFetch<any[]>('/reports/doctors', {}, token);
}

export async function getStaffListAction(token?: string) {
  return serverFetch<any[]>('/staff', {}, token);
}

export async function punchAttendanceAction(data: any, token?: string) {
  return serverFetch<any>(
    '/staff/attendance',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}
