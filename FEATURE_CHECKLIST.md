# HPC Jashore — Master Feature Checklist
**Source of truth for scope.** Check off as built + demoed in clinic, not just coded.
Legend: `[ ]` todo · `[~]` in progress · `[x]` done + demoed · **P0** must-have for launch, **P1** should-have, **P2** post-launch.

## A. Identity, Auth & Access (P0)
- [ ] Personal login: Admin, Doctor (email + password, JWT access + refresh, multi-device sessions)
- [ ] Desk accounts: Reception / Therapist / Cashier shared logins (one per desk device)
- [ ] Per-action auth: staff selector + 4-digit PIN verify endpoint, rate-limited, 5-try lockout, admin reset
- [ ] PIN policy: no sequential/repeated digits, forced change every 90 days (configurable), per-staff salt+hash (bcrypt/argon2)
- [ ] Role-based access control on every API route + UI route guard
- [ ] Permissions matrix documented (who can discount / void / delete / reset PIN / close day)
- [ ] Device/desk registry: name desks (Reception-1, Cashier-1, Tab-Therapy-A), bind tokens, remote revoke
- [ ] Audit log: actor + desk + PIN identity + action + before/after JSON + IP; immutable, admin-viewable, exportable
- [ ] Password reset (admin-assisted), session list + remote logout

## B. Admin Panel (P0)
- [ ] Dashboard: today footfall, collection, dues, occupancy, staff online
- [ ] User/staff CRUD, roles, activation/deactivation, PIN reset
- [ ] Desk/device management + TV pairing codes (6-digit, 15-min expiry)
- [ ] Fee catalog, therapy catalog, room/bed/machine registry, package builder
- [ ] Holiday / working-hours / doctor roster config
- [ ] Announcement composer → TV + all screens (realtime)
- [ ] Audit viewer (filter by actor, desk, action, date) + export
- [ ] Backup now / restore / download snapshot buttons
- [ ] Print template editor (header, Bangla lines, footer, receipt width)
- [ ] Settings: clinic profile, MRN/bill/token numbering, discount thresholds, low-stock levels

## C. Patient Directory (P0)
- [ ] MRN auto-generation (`HPC-YY-00001`), QR code per patient
- [ ] Bilingual name, phone (BD `01XXXXXXXXX` validation, unique), DOB/age, gender, blood group
- [ ] Address (village/union/upazila/district), occupation, emergency contact
- [ ] Photo capture/upload, NID/reports/consent attachments
- [ ] Allergies, chronic conditions, contraindications flags (visible to doctor/therapist)
- [ ] Consent records (traction, dry needling, manipulation) with signature/photo
- [ ] Full visit history timeline, dues/advances balance, package credits
- [ ] Search: MRN / phone / name (fuzzy, Bangla-tolerant), < 300ms on 50k records
- [ ] Merge duplicates (admin, audited), soft-delete only
- [ ] Export patient list (Excel/PDF), consent-form print

## D. Check-in / Check-out + Appointments (P0)
- [ ] Walk-in check-in, phone booking, future appointment slots per doctor
- [ ] Visit states: scheduled → checked_in → in_consult → in_therapy → billed → checked_out (+ cancelled / no_show)
- [ ] Token slip print (thermal, QR, Bangla directions, est. wait)
- [ ] Check-out only when bill settled or due recorded with approval
- [ ] Appointment calendar (day/week/doctor), SMS-ready reminder hooks (P2: actual SMS)
- [ ] Missed follow-up / no-show recall list

## E. Queue, Serial & Routing (P0)
- [ ] Per-doctor daily serial: quota, walk-in vs booked, call-next / recall / skip / complete / transfer
- [ ] Per-therapy queue with bed/machine-aware ordering
- [ ] Priority rules (emergency, package, follow-up, elderly) — configurable
- [ ] Live routing trail per patient: reception → chamber → therapy → cashier → exit
- [ ] Handoff actions explicit (not verbal): "send to therapy-2", "send to cashier"
- [ ] Estimated wait display on reception + TV
- [ ] Doctor break / room-change broadcast to queues + TV

## F. Doctor Consultation (P0)
- [ ] Consultation workspace: SOAP, vitals, pain VAS/NPRS, ROM/MMT pickers
- [ ] Diagnosis (ICD-11 physio subset), investigations advised, referral to therapy (auto-creates therapy plan)
- [ ] Follow-up date → feeds appointment + recall list
- [ ] Doctor dashboard: today's serials, pending follow-ups, stats
- [ ] **P1:** diagnosis favourites, note templates per condition

## G. Prescribing (P0)
- [ ] Stock-aware prescribing from medicine inventory (override needs reason + PIN)
- [ ] Dosage templates + auto Bangla directions ("1+0+1 — ভরা পেটে — 7 দিন")
- [ ] A4 print + PDF with clinic header, doctor signature block, MRN/QR
- [ ] Dispense step at cashier/pharmacy decrements batch (FIFO + expiry check)

## H. Clinical Assessment (P0 core, P1 depth)
- [ ] Baseline + per-visit outcome scores; pain-over-time chart
- [ ] Templates P0: low back, neck, knee, shoulder, neuro-basic
- [ ] **P1:** ODI, NDI, WOMAC, Berg, mRS full scoring; progress comparison printout
- [ ] Contraindication warnings from patient flags

## I. Therapy Sessions (P0)
- [ ] Modality catalog: UST/TENS/IFT/SWD/traction/manual/exercise + duration + machine + fee
- [ ] Plan from doctor: N sessions, frequency, modalities
- [ ] Scheduling + therapist assignment (skill-aware) + bed/room/machine booking with conflict block
- [ ] Live timer: start / pause / complete, PIN-attributed, overtime flag
- [ ] Session outcome note + pain re-score; auto-suggest next session
- [ ] Therapist desk: "my sessions today", one-tap actions
- [ ] Therapy card print (sessions done/remaining)

## J. Packages (P0 build, launch-enabled)
- [ ] Package builder: consultations + N therapy sessions + validity days + price
- [ ] Sale → credit ledger (remaining sessions), expiry, pause (medical), transfer rules
- [ ] Package vs pay-per-session switch at billing with ledger check
- [ ] Utilization + expiry-approaching reports

## K. Rooms & Resources (P0)
- [ ] Rooms: chambers, therapy hall beds, waiting capacity, cleaning buffer
- [ ] Machines: status free/occupied/maintenance, service-due alerts
- [ ] Live occupancy board (reception + TV v2)
- [ ] **P1:** maintenance log + service reminders

## L. Payments — all manual/offline (P0)
- [ ] Bill builder: consult + therapy + medicine + package + misc; per-line discount
- [ ] Discount rules + approval threshold (cashier limit vs admin PIN)
- [ ] Dues / advances ledger, partial payments, due-slip print
- [ ] Refund + void with reason + authorizing PIN (audited, anomaly-flagged)
- [ ] Payment modes: cash / bKash / Nagad / Rocket / card / bank (manual entry + txn id)
- [ ] Cash drawer per cashier per shift: open / denomination count / handover / close
- [ ] Day-close report; day cannot close with unbalanced drawer (or records variance + PIN)
- [ ] Thermal receipt + duplicate/cancelled-stamp handling

## M. Medicine Inventory (P0)
- [ ] Purchase entry (supplier, batch, mfg/exp, qty, rate), purchase return
- [ ] FIFO dispense, expiry block (override + audit), near-expiry + low-stock alerts
- [ ] Damage/expired write-off (PIN + audit), stock audit count mode
- [ ] Supplier + purchase history, margin report

## N. General Inventory & Assets (P0 lite, P1 full)
- [ ] Consumables (gel, electrodes), linen, stationery with room linkage
- [ ] Assets: machines/furniture with service schedule **(P1)**
- [ ] Stock alerts dashboard; monthly stock report

## O. Expenses (P0 lite) ⭐ gap you didn't list
- [ ] Expense entry (rent, salary, utilities, purchase) with category + voucher + approver PIN
- [ ] Monthly P&L one-pager (collection − expense)

## P. Reports (P0 set, P1 depth)
- [ ] Daily collection + mode-wise breakup + drawer reconciliation
- [ ] Doctor-wise income/sessions, therapist-wise sessions/outcomes
- [ ] Dues/advances aging, package utilization/expiry
- [ ] Footfall: new vs repeat, peak hours, no-show rate
- [ ] Discount/void/refund anomaly report
- [ ] Every report: screen + PDF + Excel export

## Q. Staff Performance & Monitoring (P0 lite, P1 full)
- [ ] PIN punch-in/out attendance + roster/shift plan
- [ ] Per-staff: hours, sessions, collection handled, discounts/voids, on-time rate
- [ ] Patient feedback score per therapist/doctor (tablet kiosk 1–5 + comment)
- [ ] Anomaly flags (high void, high discount, after-hours access)

## R. Realtime & TV (P0)
- [ ] Socket.IO rooms + SSE feeds; reconnect with resume; presence (who's online where)
- [ ] TV app: now-serving, next-5, room directions, announcements (BN+EN), "connecting" offline state
- [ ] TV pairing flow + read-only scoped token + remote revoke
- [ ] In-app update prompts (Android/Tauri) + PWA reload prompt

## S. Printing (P0)
- [ ] Token slip + receipt (thermal 80mm); **prescription + invoice on custom 5.5in × 8.27in paper**; reports + other docs on A4; therapy card
- [ ] Dual dark/light theme (emerald green + black/white) on all four clients, persisted per device
- [ ] PDF fallback for every print; Bluetooth/network printer config per desk
- [ ] Bangla font tested on all printers before pilot

## T. Platform & Offline (P0)
- [ ] Next.js PWA installable, offline queue + patient-search cache, queued writes sync
- [ ] Android adaptive layouts (phone/tablet, portrait/landscape), TV Leanback module
- [ ] Tauri desktop (Windows priority) + mobile builds from releases
- [ ] Release channels: `android-v*`, `tv-v*`, `tauri-v*` tags → OTA feeds

## U. Infra, CI/CD, Security (P0)
- [ ] Lightsail + Nginx (IPv4+IPv6, TLS, SSE-safe proxy) + Cloudflare (DNS, WAF, cache bypass on realtime)
- [ ] GH Actions: lint/test/build per app; API deploy on `main`; client artifacts on tags
- [ ] Secrets in env/vault, never in repo; rate limits; PIN lockout; JWT rotation
- [ ] Backups: Litestream/snapshot nightly, 30-day retention; monthly restore drill
- [ ] Health checks + disk alerts; staging vhost from `develop`

## V. Pilot & Training (P0)
- [ ] 2-week parallel run, paper-off criteria, rollback plan
- [ ] Cheat sheets per desk (Bangla + English), 1-day staff training
- [ ] Load test: 200 socket clients, billing burst; printer matrix test

## W. Post-launch (P2 — do NOT build now)
- [ ] SMS (BulkSMSBD/SSL Wireless): reminders, due nudges, serial alerts
- [ ] Patient portal / online booking link
- [ ] Tele-consult (WebRTC) + stored consent
- [ ] Multi-branch, accounts software integration, insurance/TPA
