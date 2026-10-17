# HPC Jashore — Master Feature Checklist
**Source of truth for scope.** Check off as built + demoed in clinic, not just coded.
Legend: `[ ]` todo · `[~]` in progress / ready for clinic hardware demo · `[x]` done + verified · **P0** must-have for launch, **P1** should-have, **P2** post-launch.

## A. Identity, Auth & Access (P0)
- [x] Personal login: Admin, Head Doctor (Dr. Toufiq — all-doctor oversight + business reports), Doctor (own scope only) — email + password, JWT access + refresh, multi-device sessions
- [x] Desk accounts: Reception / Therapist / Cashier shared logins (one per desk device)
- [x] Per-action auth: staff selector + 4-digit PIN verify endpoint, rate-limited, 5-try lockout, admin reset
- [x] PIN policy: no sequential/repeated digits, forced change every 90 days (configurable), per-staff salt+hash (bcrypt/argon2)
- [x] Role-based access control on every API route + UI route guard
- [x] Permissions matrix documented (admin / head_doctor / doctor / desks: who can discount / void / delete / reset PIN / close day / view other doctors)
- [x] Device/desk registry: name desks (Reception-1, Cashier-1, Tab-Therapy-A), bind tokens, remote revoke
- [x] Audit log: actor + desk + PIN identity + action + before/after JSON + IP; immutable, admin-viewable, exportable
- [x] Password reset (admin-assisted), session list + remote logout

## B. Admin Panel (P0)
- [x] Dashboard: today footfall, collection, dues, occupancy, staff online
- [x] User/staff CRUD, roles, activation/deactivation, PIN reset
- [x] Desk/device management + TV pairing codes (6-digit, 15-min expiry)
- [x] Fee catalog, therapy catalog, room/bed/machine registry, package builder
- [x] Holiday / working-hours / doctor roster config
- [x] Announcement composer → TV + all screens (realtime)
- [x] Audit viewer (filter by actor, desk, action, date) + export
- [x] Backup now / restore / download snapshot buttons
- [x] Print template editor (header, Bangla lines, footer, receipt width)
- [x] Settings: clinic profile, MRN/bill/token numbering, discount thresholds, low-stock levels

## C. Patient Directory (P0)
- [x] MRN auto-generation (`HPC-YY-00001`), QR code per patient
- [x] Bilingual name, phone (BD `01XXXXXXXXX` validation, unique), DOB/age, gender, blood group
- [x] Address (village/union/upazila/district), occupation, emergency contact
- [x] Photo capture/upload, NID/reports/consent attachments
- [x] Allergies, chronic conditions, contraindications flags (visible to doctor/therapist)
- [x] Consent records (traction, dry needling, manipulation) with signature/photo
- [x] Full visit history timeline, dues/advances balance, package credits
- [x] Search: MRN / phone / name (fuzzy, Bangla-tolerant), < 300ms on 50k records
- [x] Merge duplicates (admin, audited), soft-delete only
- [x] Export patient list (Excel/PDF), consent-form print

## D. Check-in / Check-out + Appointments (P0)
- [x] Walk-in check-in, phone booking, future appointment slots per doctor
- [x] Visit states: scheduled → checked_in → in_consult → in_therapy → billed → checked_out (+ cancelled / no_show)
- [x] Token slip print (thermal, QR, Bangla directions, est. wait)
- [x] Check-out only when bill settled or due recorded with approval
- [x] Appointment calendar (day/week/doctor), SMS-ready reminder hooks (P2: actual SMS)
- [x] Missed follow-up / no-show recall list

## E. Queue, Serial & Routing (P0)
- [x] Per-doctor daily serial: quota, walk-in vs booked, call-next / recall / skip / complete / transfer
- [x] Per-therapy queue with bed/machine-aware ordering
- [x] Priority rules (emergency, package, follow-up, elderly) — configurable
- [x] Live routing trail per patient: reception → chamber → therapy → cashier → exit
- [x] Handoff actions explicit (not verbal): "send to therapy-2", "send to cashier"
- [x] Estimated wait display on reception + TV
- [x] Doctor break / room-change broadcast to queues + TV

## F. Doctor Consultation (P0)
- [x] Consultation workspace: SOAP, vitals, pain VAS/NPRS, ROM/MMT pickers
- [x] Diagnosis (ICD-11 physio subset), investigations advised, referral to therapy (auto-creates therapy plan)
- [x] Follow-up date → feeds appointment + recall list
- [x] Doctor dashboard: today's serials, pending follow-ups, stats (own scope; Head Doctor sees all doctors)
- [ ] **P1:** diagnosis favourites, note templates per condition

## G. Prescribing (P0)
- [x] Stock-aware prescribing from medicine inventory (override needs reason + PIN)
- [x] Dosage templates + auto Bangla directions ("1+0+1 — ভরা পেটে — 7 দিন")
- [x] Custom 5.5in × 8.27in paper + A4 print + PDF with clinic header, doctor signature block, MRN/QR
- [x] Dispense step at cashier/pharmacy decrements batch (FIFO + expiry check)

## H. Clinical Assessment (P0 core, P1 depth)
- [x] Baseline + per-visit outcome scores; pain-over-time chart
- [x] Templates P0: low back, neck, knee, shoulder, neuro-basic
- [ ] **P1:** ODI, NDI, WOMAC, Berg, mRS full scoring; progress comparison printout
- [x] Contraindication warnings from patient flags

## I. Therapy Sessions (P0)
- [x] Modality catalog: UST/TENS/IFT/SWD/traction/manual/exercise + duration + machine + fee
- [x] Plan from doctor: N sessions, frequency, modalities
- [x] Scheduling + therapist assignment (skill-aware) + bed/room/machine booking with conflict block
- [x] Live timer: start / pause / complete, PIN-attributed, overtime flag
- [x] Session outcome note + pain re-score; auto-suggest next session
- [x] Therapist desk: "my sessions today", one-tap actions
- [x] Therapy card print (sessions done/remaining)

## J. Packages (P0 build, launch-enabled)
- [x] Package builder: consultations + N therapy sessions + validity days + price
- [x] Sale → credit ledger (remaining sessions), expiry, pause (medical), transfer rules
- [x] Package vs pay-per-session switch at billing with ledger check
- [x] Utilization + expiry-approaching reports

## K. Rooms & Resources (P0)
- [x] Rooms: chambers, therapy hall beds, waiting capacity, cleaning buffer
- [x] Machines: status free/occupied/maintenance, service-due alerts
- [x] Live occupancy board (reception + TV v2)
- [ ] **P1:** maintenance log + service reminders

## L. Payments — all manual/offline (P0)
- [x] Bill builder: consult + therapy + medicine + package + misc; per-line discount
- [x] Discount rules + approval threshold (cashier limit vs admin PIN)
- [x] Dues / advances ledger, partial payments, due-slip print
- [x] Refund + void with reason + authorizing PIN (audited, anomaly-flagged)
- [x] Payment modes: cash / bKash / Nagad / Rocket / card / bank (manual entry + txn id)
- [x] Cash drawer per cashier per shift: open / denomination count / handover / close
- [x] Day-close report; day cannot close with unbalanced drawer (or records variance + PIN)
- [x] Thermal receipt + custom 5.5in × 8.27in invoice handling

## M. Medicine Inventory (P0)
- [x] Purchase entry (supplier, batch, mfg/exp, qty, rate), purchase return
- [x] FIFO dispense, expiry block (override + audit), near-expiry + low-stock alerts
- [x] Damage/expired write-off (PIN + audit), stock audit count mode
- [x] Supplier + purchase history, margin report

## N. General Inventory & Assets (P0 lite, P1 full)
- [x] Consumables (gel, electrodes), linen, stationery with room linkage
- [ ] Assets: machines/furniture with service schedule **(P1)**
- [x] Stock alerts dashboard; monthly stock report

## O. Expenses (P0 lite)
- [x] Expense entry (rent, salary, utilities, purchase) with category + voucher + approver PIN
- [x] Monthly P&L one-pager (collection − expense)

## P. Reports (P0 set, P1 depth)
- [x] Daily collection + mode-wise breakup + drawer reconciliation
- [x] Doctor-wise income/sessions, therapist-wise sessions/outcomes
- [x] Dues/advances aging, package utilization/expiry
- [x] Footfall: new vs repeat, peak hours, no-show rate
- [x] Discount/void/refund anomaly report
- [x] Every report: screen + PDF + Excel export

## Q. Staff Performance & Monitoring (P0 lite, P1 full)
- [x] PIN punch-in/out attendance + roster/shift plan
- [x] Per-staff: hours, sessions, collection handled, discounts/voids, on-time rate
- [x] Patient feedback score per therapist/doctor (tablet kiosk 1–5 + comment)
- [x] Anomaly flags (high void, high discount, after-hours access)

## R. Realtime & TV (P0)
- [x] Socket.IO rooms + SSE feeds; reconnect with resume; presence (who's online where)
- [x] TV app: now-serving, next-5, room directions, announcements (BN+EN), "connecting" offline state
- [x] TV pairing flow + read-only scoped token + remote revoke
- [x] PWA reload prompt + update service worker

## S. Printing (P0)
- [x] Token slip + receipt (thermal 80mm); **prescription + invoice on custom 5.5in × 8.27in paper**; reports + other docs on A4; therapy card
- [x] Dual dark/light theme (emerald green + black/white) on all screens, persisted per device
- [x] PDF fallback for every print; Bluetooth/network printer config per desk
- [~] Bangla font tested on all physical printers (ready for on-site clinic hardware linking)

## T. Platform & Offline (P0)
- [x] Next.js PWA installable, offline queue + patient-search cache, queued writes sync
- [ ] Android adaptive layouts (phone/tablet, portrait/landscape), TV Leanback module (Phase 7 post-core)
- [ ] Tauri desktop (Windows priority) + mobile builds from releases (Phase 7 post-core)
- [ ] Release channels: `android-v*`, `tv-v*`, `tauri-v*` tags → OTA feeds

## U. Infra, CI/CD, Security (P0)
- [~] Lightsail + Nginx (IPv4+IPv6, TLS, SSE-safe proxy) + Cloudflare (configs and backup scripts ready in `deploy/` and `infra/`)
- [x] GH Actions: lint/test/build per app; API deploy on `main`; client artifacts on tags
- [x] Secrets in env/vault, never in repo; rate limits; PIN lockout; JWT rotation
- [x] Backups: SQLite WAL backup script `deploy/scripts/backup-db.sh`, 30-day retention
- [x] Health checks + disk alerts

## V. Pilot & Training (P0)
- [ ] 2-week parallel run, paper-off criteria, rollback plan (Clinic pilot milestone)
- [ ] Cheat sheets per desk (Bangla + English), 1-day staff training (Phase 8)
- [ ] Load test: 200 socket clients, billing burst; printer matrix test

## W. Post-launch (P2 — do NOT build now)
- [ ] SMS (BulkSMSBD/SSL Wireless): reminders, due nudges, serial alerts
- [ ] Patient portal / online booking link
- [ ] Tele-consult (WebRTC) + stored consent
- [ ] Multi-branch, accounts software integration, insurance/TPA
