// apps/web/lib/actions/bulletins.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export interface BulletinRecord {
  id: string;
  title: string;
  contentEn: string;
  contentBn: string;
  isUrgent: number; // 1 = urgent, 0 = normal
  isActive: number; // 1 = active, 0 = inactive
  priority: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listBulletinsAction(): Promise<{
  success: boolean;
  data?: BulletinRecord[];
  error?: string;
}> {
  try {
    const data = await serverFetch<BulletinRecord[]>('/bulletins');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list bulletins' };
  }
}

export async function listActiveBulletinsAction(): Promise<{
  success: boolean;
  data?: BulletinRecord[];
  error?: string;
}> {
  try {
    const data = await serverFetch<BulletinRecord[]>('/bulletins/active');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list active bulletins' };
  }
}

export async function createBulletinAction(dto: {
  title: string;
  contentEn: string;
  contentBn: string;
  isUrgent?: boolean;
  isActive?: boolean;
  priority?: number;
}): Promise<{
  success: boolean;
  data?: BulletinRecord;
  error?: string;
}> {
  try {
    const data = await serverFetch<BulletinRecord>('/bulletins', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    revalidatePath('/tv');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create bulletin' };
  }
}

export async function updateBulletinAction(
  id: string,
  dto: {
    title?: string;
    contentEn?: string;
    contentBn?: string;
    isUrgent?: boolean;
    isActive?: boolean;
    priority?: number;
  },
): Promise<{
  success: boolean;
  data?: BulletinRecord;
  error?: string;
}> {
  try {
    const data = await serverFetch<BulletinRecord>(`/bulletins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    revalidatePath('/admin');
    revalidatePath('/tv');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update bulletin' };
  }
}

export async function deleteBulletinAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/bulletins/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin');
    revalidatePath('/tv');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete bulletin' };
  }
}
