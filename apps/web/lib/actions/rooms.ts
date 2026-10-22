// apps/web/lib/actions/rooms.ts
'use server';

import { serverFetch } from '../server-api';
import { revalidatePath } from 'next/cache';

export type RoomType =
  | 'waiting_room'
  | 'public_room'
  | 'private_room'
  | 'doctor_consultation_room'
  | 'therapy_room'
  | 'therapy_hall'
  | 'staff_room'
  | 'cashier_room';

export type RoomGender = 'common' | 'male' | 'female';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'not_allowed';

export interface RoomRecord {
  id: string;
  roomNumber: string;
  name: string;
  type: RoomType;
  gender: RoomGender;
  status: RoomStatus;
  capacity: number;
  notes?: string | null;
  isActive: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  notAllowed: number;
  totalCapacity?: number;
}

export interface PagedRoomsResult {
  items: RoomRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: RoomStats;
}

export interface CreateRoomInput {
  roomNumber: string;
  name: string;
  type: RoomType;
  gender?: RoomGender;
  status?: RoomStatus;
  capacity?: number;
  notes?: string;
}

export interface UpdateRoomInput {
  roomNumber?: string;
  name?: string;
  type?: RoomType;
  gender?: RoomGender;
  status?: RoomStatus;
  capacity?: number;
  notes?: string;
  isActive?: number;
}

export async function listRoomsAction(params?: {
  query?: string;
  type?: string;
  gender?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: PagedRoomsResult;
  error?: string;
}> {
  try {
    const queryParts: string[] = [];
    if (params?.query && params.query.trim()) {
      queryParts.push(`query=${encodeURIComponent(params.query.trim())}`);
    }
    if (params?.type && params.type !== 'all') {
      queryParts.push(`type=${encodeURIComponent(params.type)}`);
    }
    if (params?.gender && params.gender !== 'all') {
      queryParts.push(`gender=${encodeURIComponent(params.gender)}`);
    }
    if (params?.status && params.status !== 'all') {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    queryParts.push(`page=${params?.page ?? 1}`);
    queryParts.push(`limit=${params?.limit ?? 50}`);

    const queryString = queryParts.join('&');
    const path = `/rooms${queryString ? `?${queryString}` : ''}`;

    const res = await serverFetch<PagedRoomsResult>(path);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list rooms' };
  }
}

export async function getRoomDetailAction(id: string): Promise<{
  success: boolean;
  data?: RoomRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<RoomRecord>(`/rooms/${encodeURIComponent(id)}`);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch room details' };
  }
}

export async function createRoomAction(dto: CreateRoomInput): Promise<{
  success: boolean;
  data?: RoomRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<RoomRecord>('/rooms', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create room' };
  }
}

export async function updateRoomAction(
  id: string,
  dto: UpdateRoomInput,
): Promise<{
  success: boolean;
  data?: RoomRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<RoomRecord>(`/rooms/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });

    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update room' };
  }
}

export async function updateRoomStatusAction(
  id: string,
  status: RoomStatus,
): Promise<{
  success: boolean;
  data?: RoomRecord;
  error?: string;
}> {
  try {
    const res = await serverFetch<RoomRecord>(`/rooms/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update room status' };
  }
}

export async function deleteRoomAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await serverFetch(`/rooms/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete room' };
  }
}
