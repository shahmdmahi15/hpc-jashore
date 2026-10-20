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
  role:
    | 'admin'
    | 'doctor'
    | 'head_doctor'
    | 'handler'
    | 'therapist'
    | 'cashier'
    | 'receptionist'
    | 'reception';
  userId: string;
  email: string;
  displayName: string;
  staffId?: string;
}

let activeSession: UserSession | null = null;

export function getRoleHomeRoute(role?: string): string {
  switch (role) {
    case 'doctor':
    case 'head_doctor':
      return '/admin?tab=doctor';
    case 'handler':
    case 'therapist':
      return '/admin?tab=handler';
    case 'cashier':
      return '/admin?tab=cashier';
    case 'receptionist':
    case 'reception':
      return '/admin?tab=reception';
    case 'admin':
    default:
      return '/admin?tab=admin';
  }
}

export function setSession(session: UserSession | null) {
  activeSession = session;
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem('hpc_session', JSON.stringify(session));
      document.cookie = `hpc_session=1; path=/; max-age=604800; SameSite=Lax`;
    } else {
      localStorage.removeItem('hpc_session');
      document.cookie = `hpc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
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
    list: (search?: string) =>
      apiFetch<any[]>(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (data: any) =>
      apiFetch<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => apiFetch<any>(`/patients/${id}`),
    getHistory: (id: string) => apiFetch<any>(`/patients/${id}/history`),
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
    punch: (data: any) =>
      apiFetch<any>('/staff/attendance', { method: 'POST', body: JSON.stringify(data) }),
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
};
