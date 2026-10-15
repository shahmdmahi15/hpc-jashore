# HPC Health & Pain Care Center — Jashore
## Full Realtime Physiotherapy Center Management Platform
**Owner:** Dr. Toufiq (Md. Toufiq Uz Zaman) — Head Doctor + owner (multiple doctors at the center)
**Repo root:** `hpc-jashore` | **Date:** 2026-10-15

This is the master roadmap. Companion docs:
- [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md) — exhaustive build checklist (the source of truth for scope)
- [ARCHITECTURE.md](ARCHITECTURE.md) — tech decisions, monorepo layout, API design, realtime protocol, infra

---

## 1. Vision

One in-house system that runs the entire clinic realtime:

> Patient walks in → reception checks in → doctor serial → consultation → therapy plan / package → therapist sessions → cashier payment → routing screen + TV + every staff screen updates instantly.

No paper tokens. No "go ask the reception." Every screen is live, every action is PIN-attributed, every taka is auditable.

### Product principles (non-negotiable for "robust")

1. **Realtime first:** any create/update must appear on all relevant screens in < 1s on LAN-quality internet.
2. **Audit everything:** who did what, on which desk, with whose PIN, at what time. No silent edits.
3. **Desk + PIN model:** Receptionist / Therapist / Cashier are *shared desk accounts* on shift; individual staff authenticate per-action with staff selector + 4-digit PIN. Doctors and Admins have personal logins.
4. **Offline-resilient:** internet in Jashore will drop. Reception check-in, queue, and cashier day-close must survive short outages and sync.
5. **Print-ready:** token slips + receipts on thermal 80mm; prescriptions + invoices on custom 5.5in × 8.27in paper; reports + everything else on A4. PDF fallback for every print — tested before pilot, never during.
6. **Bangla + English:** patient-facing screens (TV, token, prescription header) bilingual.
7. **Single backend truth:** NestJS core API is the only writer to the DB. All four clients (Android TV, Android app, Tauri, Next.js PWA) are dumb views over the same realtime API.

---

## 2. System at a glance

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Waiting TV   │  │ Android      │  │ Tauri        │  │ Next.js PWA  │
│ Compose TV   │  │ Compose App  │  │ Desktop+Mob  │  │ App Router   │
│ (read-only + │  │ Admin/Dr/Rec │  │ same roles   │  │ same roles   │
│  pairing)    │  │ /Ther/Cash   │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │ WS/SSE          │ REST+WS        │ REST+WS/TAURI  │ REST+WS/SSE
       └─────────────────┴────────────────┴───────────────┴──────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │  NestJS Core API      │
                              │  REST + WebSocket +   │
                              │  SSE + WebRTC(signal) │
                              │  Drizzle ORM + SQLite │
                              │  (WAL + Litestream)   │
                              └───────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
              GitHub Actions          Nginx (Lightsail)      Cloudflare
              CI/CD + OTA             IPv4+IPv6, TLS         DNS/CDN/WAF
```

**Backend:** NestJS 11, Drizzle ORM, SQLite (WAL mode) + Litestream continuous backup to S3-compatible storage. WebSocket (Socket.IO) for bidirectional rooms, SSE for one-way feeds (TV, dashboards), WebRTC signaling only if you later add tele-consult — media itself is peer-to-peer, not stored on Lightsail.

**Why SQLite warning:** SQLite is fine for a single-node clinic with < 20 concurrent writers *if* WAL is on and all writes go through one NestJS instance. If you ever add a second Lightsail instance or a second branch, migrate to Postgres. Drizzle makes that migration cheap — keep all SQL in Drizzle schema, no raw sqlite-only tricks. This is documented in ARCHITECTURE.md.

---

## 3. Monorepo layout (create this first)

```
hpc-jashore/
  apps/
    api/            # NestJS core API
    web/            # Next.js 16+ App Router PWA
    android/        # Jetpack Compose (phone/tablet + tv module)
    tauri/          # Tauri v2 (desktop + mobile, shared web frontend or native webview)
    tv/             # note: tv is a module inside android/, not separate repo
  packages/
    proto/          # shared realtime event contract (JSON schemas / TS types)
    ui/             # shared design tokens, print templates
    config/         # eslint, tsconfig, env validation
  infra/
    nginx/          # reverse proxy, IPv6, caching, SSE hardening
    lightsail/      # setup scripts, firewall, backups
    cloudflare/     # DNS, cache rules, WAF notes
  .github/workflows/# ci.yml, release channels per app
  docs/             # this roadmap + ADRs
```

One repo, one release train. Each app has its own release channel (see §6).

---

## 4. Phased roadmap

### Phase 0 — Foundation & decisions (Week 1–2)
**Goal:** stop guessing, lock contracts.

- [ ] Finalize monorepo + branch strategy (`main` = production, `develop` = staging)
- [ ] Lock shared event contract: `proto/` v1 (naming: `queue.updated`, `serial.called`, `payment.posted`, etc.)
- [ ] Lock roles & permissions matrix (Admin, Doctor, Receptionist desk, Therapist desk, Cashier desk)
- [ ] Lock MRN format (e.g. `HPC-YY-00001`), token format, bill numbering, PIN policy (4-digit, lockout after 5 fails, admin reset)
- [ ] Decide Bangla font + print templates (thermal 80mm, A4 prescription)
- [ ] Provision Lightsail (2GB+ RAM), Ubuntu LTS, Nginx, Node 22 LTS, Cloudflare DNS (AAAA + A), TLS
- [ ] GitHub Actions skeleton: lint → test → build → deploy API → build clients
- **Exit criteria:** `GET /healthz` live on the domain over IPv4+IPv6; CI green on empty apps.

### Phase 1 — Core API + Auth + Admin skeleton (Week 3–5)
**Goal:** login works, roles enforced, audit on.

- Auth: Admin/Doctor personal login (email+password, JWT access+refresh, device sessions). Desk accounts: shared login + per-action staff selector + PIN verification endpoint (`POST /auth/pin-verify` with rate limit + audit).
- Users, staff profiles, shifts, desks (which tablet/PC is "Reception-1").
- RBAC guard on every route + `audit_logs` table (actor, desk, PIN identity, before/after JSON).
- Settings module: clinic profile, fees, therapy modalities catalog, room list, print headers.
- Realtime backbone: Socket.IO rooms (`clinic:global`, `role:reception`, `room:{id}`, `patient:{id}`), SSE fallback feed, presence (who is online at which desk).
- Admin panel (web first): user/staff CRUD, desk management, PIN reset, audit viewer, settings.
- **Exit criteria:** Admin can create staff, staff can PIN-verify, every write appears in audit log; Socket event round-trip < 500ms on Lightsail.

### Phase 2 — Patient directory + Check-in/out + Routing (Week 6–8)
**Goal:** the front-desk flow works end to end.

- Patient directory: MRN, name (EN+BN), phone (unique, BD validation 01XXXXXXXXX), DOB/age, gender, address, photo, allergies, chronic conditions, consent records, attachments (NID, reports), QR code per patient.
- Check-in/out: walk-in, phone booking, future appointment; visit states (`scheduled → checked_in → in_consult → in_therapy → billed → checked_out → cancelled/no_show`); token slip print with QR.
- Patient routing: live "where is the patient now" — reception → doctor chamber → therapy room → cashier → exit; each handoff is an explicit realtime event, not a phone call.
- Waiting queue engine: per-doctor serial queue + per-therapy queue; priority (emergency, package, follow-up), estimated wait time calc.
- TV feed v1: now-serving, next-5, room directions in Bangla+English (SSE, read-only token).
- **Exit criteria:** 50 test patients checked in/out with correct routing trail; TV updates without refresh.

### Phase 3 — Doctor consultation serial + Prescribing + Clinical assessment (Week 9–12)
**Goal:** doctors live in the system, not beside it.

- Serial system: per-doctor daily serial slots, quota, calling (`call next`, `recall`, `skip`, `complete`), break/room change, serial transfer between doctors.
- Consultation workspace: SOAP notes, vitals, pain scales (VAS/NPRS), ROM/MMT pickers, diagnosis (ICD-11 subset relevant to physio), investigations advised, follow-up date.
- Prescribing: medicine from inventory (stock-aware — can't prescribe what isn't in stock unless overridden with reason), dosage templates ("1+0+1 after meal × 7 days"), Bangla directions auto-text, A4 print + PDF.
- Clinical assessment: physio-specific templates — low back (Oswestry ODI), neck (NDI), knee (WOMAC-lite), shoulder, neuro (mRS/Berg subset), progress comparison across visits (chart: pain score over time).
- Doctor dashboard: today's serials, pending follow-ups, my earnings/stats.
- **Exit criteria:** a full consultation (call → assess → prescribe → refer to therapy) completes with zero paper; prescription prints correctly.

### Phase 4 — Therapy sessions + Rooms + Packages (Week 13–16)
**Goal:** the therapy floor runs on the system.

- Therapy catalog: modalities (UST, TENS, IFT, SWD, traction, manual therapy, exercise), duration, machine required, default fee, therapist skill tags.
- Session engine: plan (doctor prescribes N sessions) → schedule → assign therapist + room/bed + machine → live timer (start/pause/complete) → outcome note → next session auto-suggest.
- Room management: chambers, therapy beds, machines (status: free/occupied/maintenance), cleaning buffer, conflict prevention (no double-booking a bed).
- Packages (build now, enable at launch): bundle of consultations + N therapy sessions at a package price; credit ledger (sessions remaining), expiry, transfer rules, pause on medical grounds; package vs pay-per-session billing switch.
- Therapist desk: "my sessions today," one-tap start/complete with PIN, performance (sessions done, on-time rate, patient improvement).
- **Exit criteria:** 100-session stress test with no double-booked bed; package ledger balances to zero correctly.

### Phase 5 — Payments + Medicine + General inventory (Week 17–20)
**Goal:** money and stock are exact.

- Payments (all offline/manual): bill builder (consult + therapy + medicine + package), discount (%, approval threshold), VAT handling per BD norms, dues/advance, refund, void with reason + PIN; cash drawer per cashier per shift (open/close, denomination count, handover); day-close report; receipt print (thermal) + duplicate detection.
- Medicine inventory: purchase, batch/expiry, stock alert, low-stock dashboard, damage/return, stock audit; prescription decrements stock at dispense.
- General inventory: consumables (gel, electrodes, tissue), assets (machines with service schedule), linen, stationery — with rooms linked (what is *where*).
- **Exit criteria:** day-close reconciles 10/10 test days; expired batch cannot be dispensed without override + audit.

### Phase 6 — Reports + Staff performance + Admin panel complete (Week 21–23)
**Goal:** Dr. Toufiq, as Head Doctor + owner, sees the whole business in one screen.

- Reports: daily collection, doctor-wise income, therapist-wise sessions, dues/advances aging, package utilization, medicine margin, expense (add simple expense module — rent, salary, utilities), patient footfall, new vs repeat, peak hours.
- Staff performance: attendance (PIN punch-in/out), sessions/hours, collection handled, discounts given, voids, patient feedback score, leaderboards + anomaly flags (e.g. unusual void rate).
- Admin panel complete: everything above + backup/restore button, announcement composer (push text to TV + all screens), holiday/ hours config.
- Export: PDF + Excel for every report; monthly P&L one-pager.
- **Exit criteria:** month-end close produces P&L matching manual tally in pilot.

### Phase 7 — All four clients to parity + OTA (Week 24–28)
**Goal:** every device runs the same truth, updates itself.

- Next.js PWA: full roles, installable, offline queue page + cached patient search; deploys on push to `main` via GH Actions.
- Android Compose (phone/tablet): adaptive layouts (compact/medium/expanded), desk PIN sheets, Bluetooth thermal printing; in-app update via GitHub Releases (auto-check on launch + nightly).
- Android TV: separate `tv` module (Leanback), pairing code from admin panel (6-digit, 15-min expiry), read-only SSE feed, remote-friendly, kiosk lockdown; same OTA channel.
- Tauri: desktop (Windows — your clinic PCs) + Android/iOS from one codebase; auto-updater pointed at GitHub Releases.
- **Exit criteria:** same test script passes on all four clients; killing the internet for 5 min doesn't lose a check-in or payment draft.

### Phase 8 — Pilot, hardening, launch (Week 29–32)
**Goal:** run the real clinic on it.

- 2-week parallel pilot (paper + system), then paper off.
- Load test: 200 concurrent socket clients (TVs + tablets), payment burst test.
- Security pass: rate limits, PIN lockout, JWT rotation, backup restore drill, Cloudflare WAF on.
- Training: 1-page cheat sheets per desk (reception/therapist/cashier/doctor), Bangla versions.
- Go-live checklist + rollback plan (keep nightly SQLite snapshots for 30 days).
- **Post-launch backlog:** SMS (BulkSMSBD), patient portal/booking link, tele-consult (WebRTC), multi-branch, accounts integration.

**Rough timeline:** ~7–8 months solo; ~4–5 months with 2 devs (one backend/infra, one clients). Don't compress Phase 1–2 — every later bug is a Phase 1 shortcut.

---

## 5. What you didn't list but must build (gaps)

These are the things clinics discover missing on day 3 of go-live:

1. **Appointments (future booking):** your spec has check-in but not "come next Tuesday 5pm." Needed for follow-ups and packages.
2. **Token/queue slips + QR:** printed slip is the patient's UI. Without it, routing fails.
3. **Announcements to TV:** "Dr. X is on break, serial resumes 6pm" — admin composer to TV/screens.
4. **Expenses module:** collection means nothing without rent/salary/utilities beside it.
5. **Cash drawer + day-close + handover:** the #1 source of staff disputes. Build early.
6. **Discount/void approvals:** who can discount how much, and whose PIN approved it.
7. **Dues & advances ledger:** patients *will* pay partially. Track it or lose it.
8. **Batch/expiry + stock alerts:** medicine without expiry control is a liability.
9. **Consent forms + attachments:** physio needs signed consent (traction, dry needling, etc.) — store scans/photos.
10. **Follow-up recall:** "missed follow-up" list is free revenue and better care.
11. **Attendance + roster:** PIN punch-in gives you performance data for free.
12. **Audit log viewer + backup button in admin panel:** if Dr. Toufiq can't see and restore, it's not robust.
13. **Bangla printing + offline drafts:** test both before pilot, not during.
14. **Pairing + remote wipe for TV/tablets:** a stolen tablet must be revocable from admin panel.

Full itemized scope lives in [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md).

---

## 6. Self-update design (all clients update on git push)

| Client | Mechanism | Trigger |
|---|---|---|
| Next.js PWA | GH Actions builds → deploys to Lightsail; service worker prompts "New version — reload" | push to `main` |
| Android phone/tablet | In-app updater: checks `GET /updates/android.json` (generated from GitHub Releases) → downloads APK → prompts install | new Release tag `android-v*` |
| Android TV | Same updater, Leanback UI; TVs poll nightly 3am + on boot | tag `tv-v*` (or same as android) |
| Tauri | Built-in `updater` plugin pointed at GitHub Releases static feed | tag `tauri-v*` |
| API | GH Actions SSH → Lightsail → pnpm install → migrate (Drizzle) → zero-downtime restart via PM2 | push to `main` |

TV pairing: admin panel → "Pair TV" → 6-digit code (15 min) → TV enters code → receives a long-lived read-only token scoped to `tv:feed`. No login screen on TV ever.

---

## 7. Infra checklist (Lightsail + Cloudflare + Nginx)

- [ ] Lightsail instance (Ubuntu 22.04, 2 vCPU/4GB recommended), static IPv4 + IPv6, firewall: 80/443 open, 22 restricted to your IP. Node 22 LTS + pnpm (corepack) + PM2. No Docker in v1
- [ ] Cloudflare (`hpc.toufiquzzaman.com`): A + AAAA records, proxied, TLS Full (Strict), HSTS, WAF basic rules, cache bypass for `/api/*`, `/socket.io/*`, `/sse/*`
- [ ] Nginx: reverse proxy to NestJS (localhost:4000) + Next.js (localhost:3000); HTTP/2; IPv6 listen `[::]:443`; long timeouts + `proxy_buffering off` + `X-Accel-Buffering: no` for SSE; gzip/brotli for PWA
- [ ] Backups: Litestream → S3-compatible (or Lightsail snapshots + nightly `sqlite3 .backup` to object storage, 30-day retention); test restore monthly
- [ ] Monitoring: UptimeRobot/Cloudflare health checks on `/healthz`; disk-space alert (>80%); PM2 + log rotation
- [ ] Staging: second lightweight instance or same box second vhost `staging.*` from `develop` branch

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SQLite write contention at peak | Single writer process, WAL mode, queue writes; migrate path to Postgres kept warm via Drizzle |
| Internet drop during billing | Offline draft queue in PWA/Android; SSE reconnect with Last-Event-ID; TV shows "connecting" state, never stale data as fresh |
| Shared-desk PIN abuse | Per-action PIN, 5-try lockout, anomaly reports, no PIN reuse across staff, admin-only reset with audit |
| Printer chaos (thermal/A4) | One print-template module, test matrix of devices in Phase 2, PDF fallback always available |
| Scope creep (packages, SMS, portal) | Packages in scope now; SMS/portal/tele explicitly post-launch backlog |
| Solo-dev burnout | Phase-gated; each phase ends with a demo-able clinic flow, not "infra done" |

---

## 9. Immediate next steps (this week)

1. Approve this roadmap + [checklist](FEATURE_CHECKLIST.md) + [architecture](ARCHITECTURE.md) — mark anything to cut/defer.
2. Register domain wiring in Cloudflare (A + AAAA) — confirm domain name.
3. Provision Lightsail + confirm specs/budget.
4. Scaffold monorepo (`apps/api` health check + `apps/web` hello PWA + CI green).
5. Freeze MRN/bill/token numbering + PIN policy with Dr. Toufiq.

---

*Robust means: every taka traced, every patient traceable, every screen live, every update automatic, every failure recoverable. Build in that order.*
