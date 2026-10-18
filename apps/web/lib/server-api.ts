// apps/web/lib/server-api.ts
// SERVER ONLY: Direct backend communication with NestJS API
// This module cannot and will not be bundled into the client runtime.
import 'server-only';
import { cookies } from 'next/headers';

function getBackendApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.BACKEND_API_URL ||
    'http://127.0.0.1:4000/api'
  );
}

export async function serverFetch<T>(
  path: string,
  options: RequestInit = {},
  explicitToken?: string,
): Promise<T> {
  const backendBase = getBackendApiUrl();
  const url = `${backendBase}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  // Priority: 1. Explicit token passed from caller, 2. Cookie from request headers
  let token = explicitToken;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('hpc_access_token')?.value;
    } catch {
      // cookies() may not be available in non-request contexts
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (!res.ok) {
    let errorMessage = `Backend API Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMessage = errJson.message || errJson.error || errorMessage;
    } catch {
      // non-JSON error
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g. 204 No Content)
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return {} as T;
}
