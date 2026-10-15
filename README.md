# HPC Jashore — Health & Pain Care Center, Jashore

In-house realtime physiotherapy center management platform.
Owner: Dr. Toufiq (Md. Toufiq Uz Zaman), Head Doctor · Domain: `hpc.toufiquzzaman.com`

Start with [ROADMAP.md](ROADMAP.md), then [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md)
(scope source of truth), then [ARCHITECTURE.md](ARCHITECTURE.md) (locked decisions).

## Quickstart (local dev)

Requires Node ≥ 22 and pnpm ≥ 9. Never use npm in this repo.

```bash
pnpm install
pnpm dev:api    # NestJS core API → http://localhost:4000/api/healthz
pnpm dev:web    # Next.js PWA     → http://localhost:3000
```

## Layout

- `apps/api` — NestJS core API (single writer, realtime source of truth)
- `apps/web` — Next.js 16+ App Router PWA
- `apps/android` — Jetpack Compose phone/tablet + TV (Phase 7)
- `apps/tauri` — Tauri desktop + mobile (Phase 7)
- `packages/*` — shared proto/UI/config (from Phase 0 exit)
- `infra/*` — nginx, lightsail, cloudflare notes (grows in Phase 0)

Production runs under PM2 on Lightsail — see `ecosystem.config.js`. No Docker in v1.
