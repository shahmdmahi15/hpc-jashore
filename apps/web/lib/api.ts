// apps/web/lib/api.ts
// Typed API Client for HPC Jashore (supports Web, PWA, and native Tauri Windows/Desktop)

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    process.env.NEXT_PUBLIC_IS_TAURI === 'true'
  );
}

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (isTauri()) {
      return localStorage.getItem('hpc_tauri_api_url') || 'https://hpc.toufiquzzaman.com/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:4000/api';
}

export interface UserSession {
  accessToken: string;
  role: 'admin' | 'head_doctor' | 'doctor' | 'reception' | 'therapist' | 'cashier';
  userId: string;
  email: string;
  displayName: string;
  staffId?: string;
}

let activeSession: UserSession | null = null;

export function getRoleHomeRoute(role?: string): string {
  return '/admin';
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
 * Universal API fetch client:
 * Directly invokes the REST API with JWT Bearer authentication.
 * Seamlessly functions in Web, PWA, and native Tauri runtime.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const apiBase = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${apiBase}${cleanPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API request failed: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.join(', ');
      }
    } catch {
      // non-JSON error
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return {} as T;
}

// Demo Quick-Login accounts seeded in Phase 0-1
export const DEMO_ACCOUNTS = {
  head_doctor: {
    email: 'toufiq@hpc.local',
    password: 'Toufiq123!',
    role: 'head_doctor',
    label: 'Dr. Toufiq (Head Doctor)',
    nameBn: 'ডাঃ মোঃ তৌফিক উজ জামান',
  },
  doctor: {
    email: 'doctor@hpc.local',
    password: 'Doctor123!',
    role: 'doctor',
    label: 'Dr. Demo (Physiotherapist)',
    nameBn: 'ডাঃ ডেমো (ফিজিওথেরাপিস্ট)',
  },
  reception: {
    email: 'reception@hpc.local',
    password: 'Desk1234!',
    role: 'reception',
    label: 'Reception Desk',
    nameBn: 'রিসেপশন কাউন্টার',
  },
  therapist: {
    email: 'therapist@hpc.local',
    password: 'Desk1234!',
    role: 'therapist',
    label: 'Therapy Hall Staff',
    nameBn: 'ফিজিওথেরাপি হল',
  },
  cashier: {
    email: 'cashier@hpc.local',
    password: 'Desk1234!',
    role: 'cashier',
    label: 'Cashier & Billing Desk',
    nameBn: 'বিলিং ও ক্যাশ কাউন্টার',
  },
  admin: {
    email: 'admin@hpc.local',
    password: 'Admin123!',
    role: 'admin',
    label: 'Clinic Administrator',
    nameBn: 'সিস্টেম অ্যাডমিন',
  },
} as const;

export async function loginWithEmail(email: string, password: string) {
  const data = await apiFetch<{
    accessToken: string;
    user: { id: string; email: string; role: string; displayName: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const session: UserSession = {
    accessToken: data.accessToken,
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role as any,
    displayName: data.user.displayName,
    staffId: undefined,
  };

  // Find associated staff profile if available
  try {
    const staffList = await apiFetch<any[]>('/staff', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    const matched = staffList.find(
      (s) => s.userId === session.userId || s.role === session.role,
    );
    if (matched) {
      session.staffId = matched.id;
    }
  } catch {
    // fallback gracefully
  }

  setSession(session);
  return session;
}

export async function quickLogin(role: keyof typeof DEMO_ACCOUNTS) {
  const creds = DEMO_ACCOUNTS[role];
  return loginWithEmail(creds.email, creds.password);
}

export const api = {
  auth: {
    login: loginWithEmail,
    quickLogin,
    logout: () => setSession(null),
    getSession,
    register: (data: { email: string; password: string; displayName: string; phone?: string; role?: string }) =>
      apiFetch<{ success: boolean; message: string; userId: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    forgotPassword: (email: string) =>
      apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (data: { email: string; code: string; newPassword: string }) =>
      apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyEmail: (data: { email: string; code: string }) =>
      apiFetch<{ success: boolean; message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resendVerification: (email: string) =>
      apiFetch<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
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
