# HPC Jashore — Architecture Decisions
Companion to [ROADMAP.md](ROADMAP.md). Lock these before writing feature code.

## 0. Locked decisions (2026-10-15, approved)
- **Domain:** `hpc.toufiquzzaman.com` (user holds Cloudflare + AWS root accounts).
- **Owner:** Dr. Toufiq (Md. Toufiq Uz Zaman) — Head Doctor + owner. The center has multiple doctors; Dr. Toufiq heads them.
- **Roles (locked 2026-10-16):** `admin`, `head_doctor` (Dr. Toufiq only: full clinical oversight across all doctors + business reports), `doctor` (own serials/patients/stats only, unless granted), plus shared desk logins (`reception`, `therapist`, `cashier`) with per-action staff PIN.
- **Package manager:** pnpm everywhere — never npm. Server runs Node 22 LTS (pnpm via corepack).
- **Process manager:** PM2 for Node.js (`apps/api`, `apps/web`). No Docker in v1.
- **Paper:** custom **5.5in × 8.27in** for prescriptions + invoices; **A4** for reports and everything else; thermal 80mm for token slips + receipts.
- **Theme:** emerald green + black/white, dual dark/light mode on every client (CSS variables, persisted per device).
- **SMS:** deferred to v2. v1 uses in-app + admin recall lists only — no SMS vendor work now.
- **Branches:** single branch, single Lightsail node for v1.

## 1. Stack (locked)
- **API:** NestJS 11 + TypeScript strict, Drizzle ORM, SQLite (WAL) + Litestream backup. Validation: Zod/class-validator. Auth: Passport JWT (15-min access + 7-day rotating refresh). Realtime: Socket.IO 4 (rooms) + SSE (`/sse/*` with Last-Event-ID). Docs: OpenAPI/Swagger auto-generated.
- **Web:** Next.js 16+ App Router, TypeScript, Tailwind + shadcn-style components, next-pwa (Workbox), TanStack Query + socket.io-client. Bangla font: Noto Sans Bengali / Hind Siliguri (self-hosted).
- **Android:** Kotlin, Jetpack Compose + Material3 adaptive (`currentWindowAdaptiveInfo`), Hilt, Room (offline draft cache), DataStore, Retrofit + socket.io-client, Accompanist/paging. Modules: `:app` (phone/tablet) + `:tv` (Leanback, separate launcher).
- **Tauri:** v2, Rust backend (thin — updater, printer bridge, kiosk bits) + shared web frontend (reuse Next.js export or dedicated Vite React to keep bundle small). Auto-updater → GitHub Releases.
- **Infra:** AWS Lightsail Ubuntu 22.04, Nginx 1.26 (reverse proxy, IPv6, SSE-safe), Cloudflare (DNS A+AAAA proxied, Full-Strict TLS, WAF, cache bypass on realtime paths), GitHub Actions, PM2/systemd, UptimeRobot.

## 2. Monorepo & releases
- pnpm workspaces (or npm workspaces) + Turborepo for `apps/api`, `apps/web`, `apps/android` (Gradle, wrapped), `apps/tauri`, `packages/proto|ui|config`.
- Branches: `main` (production) / `develop` (staging). Tags: `android-vX.Y.Z`, `tv-vX.Y.Z`, `tauri-vX.Y.Z`, `api-vX.Y.Z`.
- `packages/proto`: the realtime + REST contract. Versioned (`proto v1`). Breaking change = major bump + migration note. All clients codegen or import types from here. Event naming: `{domain}.{past_tense}` — `queue.updated`, `serial.called`, `payment.posted`, `session.started`, `announcement.published`.

## 3. Data model (v1 entities)
`users, staff, desks, pins (hash only), patients, visits, appointments, queues, serials, consultations, assessments, prescriptions, prescription_items, therapy_plans, therapy_sessions, rooms, beds, machines, packages, package_credits, bills, bill_items, payments, dues, cash_drawers, drawer_events, medicines, batches, stock_moves, inventory_items, expenses, announcements, audit_logs, settings, attachments, feedback, attendance`
- Every money/stock mutation writes an `audit_logs` row + domain row in one transaction.
- Soft-delete (`deleted_at`) for patients/bills/staff; hard-delete almost never.
- Numbering tables: `sequences (mrn, bill, token, voucher)` — single-row increments inside transactions to avoid duplicates under concurrency.

## 4. Auth model (the desk+PIN system)
- Admin / Head Doctor / Doctor: personal credentials → JWT. Head Doctor (Dr. Toufiq) sees all doctors' serials, patients, and business reports. A Doctor sees only own serials/patients/stats unless granted wider scope.
- Desk login: device holds a long-lived desk token (`desk:reception-1`, scopes limited, e.g. reception desk cannot void payments).
- Per-action: UI shows staff-on-shift selector → staff enters 4-digit PIN → `POST /auth/pin-verify {staffId, pin, action, deskId}` → 60-second action grant token → action executes with `actorStaffId` in audit. PINs: argon2/bcrypt, per-staff salt, 5-fail lockout 15 min, admin reset audited.
- TV: pairing-code → read-only token scoped `tv:feed` only. Revocable per device.

## 5. Realtime protocol
- Socket.IO rooms: `clinic:global`, `role:{reception,doctor,therapist,cashier,admin}`, `doctor:{id}`, `room:{id}`, `patient:{mrn}`. Server emits on every mutation; clients refetch the affected query key (no fat events — event = "what changed + id", client GETs fresh state; keeps clients consistent and payloads small).
- SSE: `/sse/tv`, `/sse/queue/:doctorId`, `/sse/dashboard` — `text/event-stream`, `proxy_buffering off`, heartbeat 15s, `Last-Event-ID` resume.
- Presence: desk heartbeat every 20s → admin "who is online" + TV "counter closed" states.
- Offline: PWA/Android queue mutations in outbox table (Room/IndexedDB) with idempotency keys (`Idempotency-Key: uuid`) so retries never double-bill.

## 6. Money & stock integrity rules
- Bill totals computed server-side; client sends lines, server reprices from fee catalog (prevents tampered totals).
- Drawer must balance to close; variance needs admin PIN + reason.
- Medicine dispense = FIFO by expiry; expired batch blocked unless override + audit.
- Package credit decrement + bill creation in one DB transaction.

## 7. Self-update (detail)
- PWA: Workbox; on new deploy, toast "New version available — Update"; version endpoint `/version.json` polled every 15 min.
- Android/Tauri: on launch + daily, `GET /updates/{channel}.json` (static file generated by GH Release workflow: version, apk/nsis/deb urls, changelog, mandatory flag). Mandatory = block app until updated (use for breaking proto changes).
- TV: same feed, polls on boot + 3am; Leanback "Updating… don't unplug" screen.

## 8. Nginx essentials (Lightsail)
- `listen 443 ssl; listen [::]:443 ssl;` (IPv6!), HTTP/2, certbot or Cloudflare Origin cert.
- `location /socket.io/`, `/sse/` → `proxy_http_version 1.1; proxy_set_header Connection ''; proxy_buffering off; proxy_read_timeout 86400;`
- Next.js + NestJS upstreams localhost; rate-limit `/auth/*` (5/s burst) and `/auth/pin-verify` (2/s, burst 5).
- Security headers, gzip/brotli (not on SSE), access logs with desk-id header.

## 9. Testing & quality gates
- API: Vitest/Jest unit (pricing, ledger, queue ordering) + e2e (check-in→consult→therapy→bill→close) on ephemeral SQLite; k6 load (200 sockets, 50 rps billing).
- Clients: critical-path UI tests (reception check-in, cashier bill+close, PIN sheet).
- CI blocks merge on fail. `develop` auto-deploys to staging; `main` to production with manual approve for API migrations.

## 10. Open decisions (need answers this week)
1. Domain name (for Cloudflare + certs)?
2. Lightsail size/budget + who holds root/Cloudflare access?
3. MRN/bill/token formats + starting numbers (migrate any paper records?)?
4. PIN policy strictness + shift/desk names + printer models per desk?
5. Bangla-first or English-first on prescriptions/TV?
6. Package prices/validity + discount authority limits (confirm with Dr. Toufiq)?
7. SMS vendor now or later (affects appointment reminders scope)?
8. Confirm: single branch, single Lightsail node for v1 (no multi-region)?
