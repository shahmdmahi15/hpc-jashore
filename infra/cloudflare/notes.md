# Cloudflare — hpc.toufiquzzaman.com

## DNS (proxied / orange cloud, after cert is issued — see infra/lightsail/setup.sh)
- `A @` → Lightsail static IPv4 — proxied
- `AAAA @` → Lightsail IPv6 — proxied
- `A staging` → staging box or same box second vhost — proxied
- `CNAME www` → `@` — proxied (redirect to apex in nginx or a Redirect Rule)

## SSL/TLS
- Mode: **Full (Strict)**. HSTS on. Always Use HTTPS on. Minimum TLS 1.2.

## Cache — bypass everything realtime
Cache Rules (in order):
1. Bypass cache when path starts with `/api/`, `/socket.io/`, `/sse/`
2. Bypass cache for `/version.json` and `/manifest.webmanifest` (fresh update checks)
3. Everything else: default (Next.js static is immutable-hashed, safe to cache)

## WAF / rate limiting (defense in depth behind nginx limits)
- Rate rule: `/api/auth/*` > 10 req/10s per IP → block 1 min
- Rate rule: `/api/auth/pin-verify` > 5 req/10s per IP → block 5 min
- Managed ruleset: Cloudflare Managed Ruleset on, sensitivity medium

## Zero Trust (optional, Phase 8)
- Put `/admin/backups` behind Access policy if backup download ever becomes HTTP.
