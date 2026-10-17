// apps/web/lib/api.ts
// Typed API Client for HPC Jashore

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface UserSession {
  accessToken: string;
  role: 'admin' | 'head_doctor' | 'doctor' | 'reception' | 'therapist' | 'cashier';
  userId: string;
  email: string;
  displayName: string;
  staffId?: string;
}

let activeSession: UserSession | null = null;

export function setSession(session: UserSession | null) {
  activeSession = session;
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem('hpc_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('hpc_session');
    }
  }
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let msg = `API Error ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }

  return res.json();
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
  };

  // Find staff record if exists
  try {
    const staffList = await apiFetch<any[]>('/staff');
    const matched = staffList.find((s) => s.userId === session.userId || s.role === session.role);
    if (matched) {
      session.staffId = matched.id;
    }
  } catch {
    // fallback
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
    getTodaySummary: () => apiFetch<any>('/reports/today'),
    getModalityStats: () => apiFetch<any[]>('/reports/modalities'),
    getDoctorStats: () => apiFetch<any[]>('/reports/doctors'),
  },
  staff: {
    list: () => apiFetch<any[]>('/staff'),
    punch: (data: any) =>
      apiFetch<any>('/staff/attendance', { method: 'POST', body: JSON.stringify(data) }),
  },
};
