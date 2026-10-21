// apps/web/lib/server-api.ts
// SERVER ONLY: Direct backend communication with NestJS API
// This module cannot and will not be bundled into the client runtime.
import 'server-only';
import { cookies, headers as nextHeaders } from 'next/headers';

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

  // Forward client network identifiers (IP and User-Agent) from the incoming request
  try {
    const reqHeaders = await nextHeaders();
    const cfIp = reqHeaders.get('cf-connecting-ip');
    const xff = reqHeaders.get('x-forwarded-for');
    const realIp = reqHeaders.get('x-real-ip');
    const clientIp = cfIp || xff?.split(',')[0]?.trim() || realIp;
    if (clientIp) {
      headers.set('cf-connecting-ip', clientIp);
      headers.set('x-forwarded-for', clientIp);
      headers.set('x-real-ip', clientIp);
    }
    const ua = reqHeaders.get('user-agent');
    if (ua) {
      headers.set('user-agent', ua);
    }
  } catch {
    // nextHeaders() not available outside active request contexts
  }

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
      if (Array.isArray(errJson.message)) {
        errorMessage = errJson.message.join(', ');
      } else if (errJson.message) {
        errorMessage = errJson.message;
      } else if (errJson.error) {
        errorMessage = errJson.error;
      }
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
