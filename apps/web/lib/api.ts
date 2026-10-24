// apps/web/lib/api.ts
// Typed API Client for HPC Jashore
// STRICT DIRECTIVE: Every request passes strictly through Next.js Server Actions.
// The backend NestJS API is internal-only and NEVER directly exposed to the public client.

import {
  executeServerAction,
  loginAction,
  logoutAction,
  registerAction,
  forgotPasswordAction,
  resetPasswordAction,
  verifyEmailAction,
  resendVerificationAction,
} from '../app/actions/api';

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    process.env.NEXT_PUBLIC_IS_TAURI === 'true'
  );
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:4000/api';
}

export interface UserSession {
  accessToken: string;
  role: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
  userId: string;
  email: string;
  displayName: string;
  staffId?: string;
}

let activeSession: UserSession | null = null;

export function getRoleHomeRoute(role?: string): string {
  switch (role) {
    case 'doctor':
      return '/doctor';
    case 'handler':
      return '/handler';
    case 'cashier':
      return '/cashier';
    case 'receptionist':
      return '/receptionist';
    case 'admin':
    default:
      return '/admin';
  }
}

export function setSession(session: UserSession | null) {
  activeSession = session;
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem('hpc_session', JSON.stringify(session));
      document.cookie = `hpc_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=2592000; SameSite=Lax; Secure`;
    } else {
      localStorage.removeItem('hpc_session');
      document.cookie = `hpc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    }
  }
}

export function clearSession() {
  logoutAction().catch(() => {});
  setSession(null);
}

export function getSession(): UserSession | null {
  if (activeSession) return activeSession;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('hpc_session');
    if (raw) {
      try {
        activeSession = JSON.parse(raw);
        return activeSession;
      } catch {
        // ignore malformed
      }
    }
  }
  return null;
}

/**
 * Route every request through Next.js Server Actions.
 * The backend API is strictly server-only and never exposed to the client.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const method = ((options.method || 'GET').toUpperCase() as
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE');

  let body: any = undefined;
  if (options.body) {
    if (typeof options.body === 'string') {
      try {
        body = JSON.parse(options.body);
      } catch {
        body = options.body;
      }
    } else {
      body = options.body;
    }
  }

  const res = await executeServerAction<T>(
    path,
    method,
    body,
    session?.accessToken,
  );

  if (!res.success) {
    throw new Error(res.error);
  }

  return res.data;
}

export async function loginWithEmail(email: string, password: string): Promise<UserSession> {
  const res = await loginAction({ email, password });
  if (!res.success) {
    throw new Error(res.error);
  }
  const sessionData = res.session;
  const session: UserSession = {
    accessToken: sessionData.accessToken,
    userId: sessionData.userId,
    email: sessionData.email,
    role: sessionData.role as any,
    displayName: sessionData.displayName,
    staffId: sessionData.staffId,
  };

  setSession(session);
  return session;
}

export const api = {
  auth: {
    login: loginWithEmail,
    logout: () => {
      logoutAction().catch(() => {});
      setSession(null);
    },
    getSession,
    register: async (data: {
      email: string;
      password: string;
      displayName: string;
      phone?: string;
      role?: string;
    }) => {
      const res = await registerAction(data);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
    forgotPassword: async (email: string) => {
      const res = await forgotPasswordAction(email);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
    resetPassword: async (data: { email: string; code: string; newPassword: string }) => {
      const res = await resetPasswordAction(data);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
    verifyEmail: async (data: { email: string; code: string }) => {
      const res = await verifyEmailAction(data);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
    resendVerification: async (email: string) => {
      const res = await resendVerificationAction(email);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
  },
  patients: {
    list: async (search?: string) => {
      const res = await apiFetch<any>(`/patients${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      return Array.isArray(res) ? res : res?.items || [];
    },
    create: (data: any) =>
      apiFetch<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => apiFetch<any>(`/patients/${id}`),
    getHistory: (id: string) => apiFetch<any>(`/patients/${id}/history`),
    createIntakeForm: (data: any) =>
      apiFetch<any>('/patients/intake-form', { method: 'POST', body: JSON.stringify(data) }),
    listIntakeForms: (params?: { date?: string; status?: string; doctorId?: string; patientId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.status) q.append('status', params.status);
      if (params?.doctorId) q.append('doctorId', params.doctorId);
      if (params?.patientId) q.append('patientId', params.patientId);
      if (params?.search) q.append('search', params.search);
      const str = q.toString();
      return apiFetch<any[]>(`/patients/intake-forms${str ? `?${str}` : ''}`);
    },
    getIntakeForm: (id: string) => apiFetch<any>(`/patients/intake-form/${id}`),
    forwardIntakeFormToCashier: (id: string) =>
      apiFetch<any>(`/patients/intake-form/${id}/forward-to-cashier`, { method: 'POST' }),
    admitIntakeFormToQueue: (id: string, data?: any) =>
      apiFetch<any>(`/patients/intake-form/${id}/admit-to-queue`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    getTimeline: (patientId: string, date?: string) =>
      apiFetch<any[]>(`/patients/${patientId}/timeline${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    addTimelineEvent: (patientId: string, data: any) =>
      apiFetch<any>(`/patients/${patientId}/timeline`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createAssessmentFile: (patientId: string, data: any) =>
      apiFetch<any>(`/patients/${patientId}/assessment-files`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listAssessmentFiles: (patientId: string) =>
      apiFetch<any[]>(`/patients/${patientId}/assessment-files`),
    getAssessmentFile: (fileId: string) =>
      apiFetch<any>(`/patients/assessment-files/${fileId}`),
    updateAssessmentFile: (fileId: string, data: any) =>
      apiFetch<any>(`/patients/assessment-files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  visits: {
    getToday: () => apiFetch<any[]>('/visits/today'),
    checkIn: (data: any) =>
      apiFetch<any>('/visits/check-in', { method: 'POST', body: JSON.stringify(data) }),
    getDoctorQueue: (doctorId: string) => apiFetch<any[]>(`/visits/doctor/${doctorId}/queue`),
    callNext: (doctorId: string, dto?: any) =>
      apiFetch<any>(`/visits/doctor/${doctorId}/call-next`, {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      }),
    callSerial: (serialId: string, dto?: any) =>
      apiFetch<any>(`/visits/serials/${serialId}/call`, {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      }),
    recallSerial: (serialId: string, dto?: any) =>
      apiFetch<any>(`/visits/serials/${serialId}/recall`, {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      }),
    markInConsultation: (serialId: string) =>
      apiFetch<any>(`/visits/serials/${serialId}/mark-in-consultation`, { method: 'POST' }),
    cancelCall: (serialId: string) =>
      apiFetch<any>(`/visits/serials/${serialId}/cancel-call`, { method: 'POST' }),
    completeSerial: (serialId: string) =>
      apiFetch<any>(`/visits/serials/${serialId}/complete`, { method: 'POST' }),
    skipSerial: (serialId: string) =>
      apiFetch<any>(`/visits/serials/${serialId}/skip`, { method: 'POST' }),
    getTvSnapshot: () => apiFetch<any>('/visits/tv/snapshot'),
  },
  clinical: {
    getConsultation: (visitId: string) => apiFetch<any>(`/clinical/consultations/${visitId}`),
    saveConsultation: (data: any) =>
      apiFetch<any>('/clinical/consultations', { method: 'POST', body: JSON.stringify(data) }),
    getPrescription: (visitId: string) => apiFetch<any>(`/clinical/prescriptions/${visitId}`),
    createPrescription: (data: any) =>
      apiFetch<any>('/clinical/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
  },
  prescriptions: {
    create: (data: any) =>
      apiFetch<any>('/clinical/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
    getByVisitId: (visitId: string) =>
      apiFetch<any>(`/clinical/prescriptions/${visitId}`),
  },
  therapy: {
    getQueue: () => apiFetch<{ waiting: any[]; nowServing: any[]; activeSessions: any[] }>('/therapy/queue'),
    getRooms: () => apiFetch<any[]>('/therapy/rooms'),
    callPatient: (data: any) =>
      apiFetch<any>('/therapy/call-patient', { method: 'POST', body: JSON.stringify(data) }),
    markInTherapy: (data: any) =>
      apiFetch<any>('/therapy/mark-in-therapy', { method: 'POST', body: JSON.stringify(data) }),
    recallPatient: (data: any) =>
      apiFetch<any>('/therapy/recall-patient', { method: 'POST', body: JSON.stringify(data) }),
    cancelCall: (data: any) =>
      apiFetch<any>('/therapy/cancel-call', { method: 'POST', body: JSON.stringify(data) }),
    getBeds: () => apiFetch<any[]>('/therapy/beds'),
    getMachines: () => apiFetch<any[]>('/therapy/machines'),
    getActiveSessions: () => apiFetch<any[]>('/therapy/sessions/active'),
    startSession: (data: any) =>
      apiFetch<any>('/therapy/sessions/start', { method: 'POST', body: JSON.stringify(data) }),
    completeSession: (id: string, data: any) =>
      apiFetch<any>(`/therapy/sessions/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPackages: () => apiFetch<any[]>('/therapy/packages'),
    purchasePackage: (data: any) =>
      apiFetch<any>('/therapy/packages/purchase', { method: 'POST', body: JSON.stringify(data) }),
    getCredits: (patientId: string) => apiFetch<any[]>(`/therapy/packages/patient/${patientId}`),
  },
  billing: {
    getDrawerStatus: (cashierStaffId: string) =>
      apiFetch<any>(`/billing/drawers/status/${cashierStaffId}`),
    openDrawer: (data: any) =>
      apiFetch<any>('/billing/drawers/open', { method: 'POST', body: JSON.stringify(data) }),
    closeDrawer: (id: string, data: any) =>
      apiFetch<any>(`/billing/drawers/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),
    getBills: () => apiFetch<any[]>('/billing/bills'),
    createBill: (data: any) =>
      apiFetch<any>('/billing/bills', { method: 'POST', body: JSON.stringify(data) }),
    recordPayment: (data: any) =>
      apiFetch<any>('/billing/payments', { method: 'POST', body: JSON.stringify(data) }),
    getDues: () => apiFetch<any[]>('/billing/dues'),
  },
  inventory: {
    getMedicines: () => apiFetch<any[]>('/inventory/medicines'),
    getBatches: () => apiFetch<any[]>('/inventory/batches'),
    getAlerts: () => apiFetch<any>('/inventory/alerts'),
    getExpenses: () => apiFetch<any[]>('/inventory/expenses'),
    createExpense: (data: any) =>
      apiFetch<any>('/inventory/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },
  reports: {
    getTodaySummary: async () => {
      try {
        return await apiFetch<any>('/reports/today');
      } catch {
        try {
          return await apiFetch<any>('/reports/daily-summary');
        } catch {
          return {
            footfall: 0,
            grossCollectionsPaisa: 0,
            bedOccupancyPercent: 0,
            totalDuesPaisa: 0,
          };
        }
      }
    },
    getModalityStats: async () => {
      try {
        return await apiFetch<any[]>('/reports/modalities');
      } catch {
        return [];
      }
    },
    getDoctorStats: async () => {
      try {
        return await apiFetch<any[]>('/reports/doctors');
      } catch {
        try {
          return await apiFetch<any[]>('/reports/doctor-income');
        } catch {
          return [];
        }
      }
    },
  },
  staff: {
    list: () => apiFetch<any[]>('/staff'),
    listDoctors: () => apiFetch<any[]>('/staff/doctors'),
    getDoctor: (id: string) => apiFetch<any>(`/staff/doctors/${id}`),
    punch: (data: any) =>
      apiFetch<any>('/staff/attendance', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    list: () => apiFetch<any[]>('/users'),
    listPending: () => apiFetch<any[]>('/users/pending'),
    approve: (id: string) =>
      apiFetch<any>(`/users/${id}/approve`, { method: 'POST' }),
    reject: (id: string, reason?: string) =>
      apiFetch<any>(`/users/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },
  updates: {
    check: (platform: string, versionCode?: number, versionName?: string) => {
      const q = new URLSearchParams({ platform });
      if (versionCode) q.set('versionCode', String(versionCode));
      if (versionName) q.set('versionName', versionName);
      return apiFetch<{
        updateAvailable: boolean;
        latestVersion: string;
        versionCode: number;
        apkUrl: string;
        notes: string;
        forceUpdate: boolean;
      }>(`/updates/check?${q.toString()}`);
    },
    triggerTauriCheck: async () => {
      if (typeof window !== 'undefined' && (window as any).__TAURI__?.core?.invoke) {
        return (window as any).__TAURI__.core.invoke('trigger_update_check');
      }
      return { updateAvailable: false, status: 'web_mode' };
    },
  },
  bulletins: {
    listAll: () => apiFetch<any[]>('/bulletins'),
    listActive: () => apiFetch<any[]>('/bulletins/active'),
    create: (data: any) =>
      apiFetch<any>('/bulletins', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/bulletins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<any>(`/bulletins/${id}`, { method: 'DELETE' }),
  },
  tv: {
    getBulletins: () => apiFetch<any[]>('/tv/bulletins'),
    setForceUpdate: (id: string, force: boolean = true) =>
      apiFetch<any>(`/tv/devices/${id}/force-update`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      }),
  },
};
