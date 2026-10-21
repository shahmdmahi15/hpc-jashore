'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
  displayName: string;
  phone?: string | null;
  isActive: number;
  mustChangePassword: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  deviceLabel: string | null;
  ip: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  user: {
    displayName: string;
    email: string;
    role: string;
  };
}

export async function listUsersAction(): Promise<{ success: boolean; data?: UserRecord[]; error?: string }> {
  try {
    const data = await serverFetch<UserRecord[]>('/users');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list users' };
  }
}

export async function createUserAction(dto: {
  displayName: string;
  email: string;
  role: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
  password: string;
  phone?: string;
}): Promise<{ success: boolean; data?: UserRecord; error?: string }> {
  try {
    const data = await serverFetch<UserRecord>('/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create user' };
  }
}

export async function updateUserAction(
  id: string,
  dto: {
    displayName?: string;
    role?: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
    phone?: string;
    isActive?: boolean;
    password?: string;
  },
): Promise<{ success: boolean; data?: UserRecord; error?: string }> {
  try {
    const data = await serverFetch<UserRecord>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user' };
  }
}

export async function toggleUserStatusAction(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; data?: UserRecord; error?: string }> {
  return updateUserAction(id, { isActive });
}

export async function deleteUserAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/users/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete user' };
  }
}

export async function listUserSessionsAction(): Promise<{ success: boolean; data?: UserSessionRecord[]; error?: string }> {
  try {
    const data = await serverFetch<UserSessionRecord[]>('/users/sessions/all');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list user sessions' };
  }
}

export async function revokeSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/users/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke session' };
  }
}
