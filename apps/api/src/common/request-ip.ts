// apps/api/src/common/request-ip.ts
import type { Request } from 'express';

/**
 * Robustly extracts the real client IP address across Cloudflare CDN,
 * Nginx reverse proxy, and Next.js SSR / Server Action proxies.
 */
export function extractClientIp(req: Request): string | null {
  // 1. Cloudflare canonical connecting IP header
  const cfIp = req.header('cf-connecting-ip');
  if (cfIp && typeof cfIp === 'string') {
    const trimmed = cfIp.trim();
    if (trimmed && trimmed !== '127.0.0.1' && trimmed !== '::1') {
      return trimmed;
    }
  }

  // 2. Standard X-Forwarded-For header (first hop is the original client)
  const xff = req.header('x-forwarded-for');
  if (xff && typeof xff === 'string') {
    const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
    // Find the first non-loopback IP if available
    for (const hop of hops) {
      if (hop !== '127.0.0.1' && hop !== '::1' && !hop.startsWith('10.') && !hop.startsWith('172.16.') && !hop.startsWith('192.168.')) {
        return hop;
      }
    }
    if (hops.length > 0 && hops[0]) {
      return hops[0];
    }
  }

  // 3. X-Real-IP header from Nginx
  const realIp = req.header('x-real-ip');
  if (realIp && typeof realIp === 'string') {
    const trimmed = realIp.trim();
    if (trimmed && trimmed !== '127.0.0.1' && trimmed !== '::1') {
      return trimmed;
    }
  }

  // 4. Express req.ip (populated when trust proxy is true) or remoteAddress
  let ip = req.ip || req.socket?.remoteAddress || null;
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return ip;
}

/**
 * Standard request metadata extractor for audit logs and session recording.
 */
export function reqMeta(req: Request) {
  return {
    ip: extractClientIp(req),
    userAgent: (req.header('user-agent') ?? null) as string | null,
    requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
  };
}
