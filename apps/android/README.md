# apps/android — Phase 7

Native Jetpack Compose app. Two modules, one repo folder:

- `:app` — phone/tablet, all roles (Admin, Doctor, Receptionist, Therapist, Cashier).
  Adaptive layouts via `currentWindowAdaptiveInfo` (compact/medium/expanded),
  Room outbox for offline drafts, Bluetooth thermal printing, in-app updater
  polling `GET /updates/android.json` (GitHub Releases feed).
- `:tv` — Leanback waiting-room display (read-only SSE feed `tv:feed` token,
  6-digit pairing from admin panel, polls updates on boot + 3am).

Scaffold with Android Studio (Kotlin, minSdk 26 / TV minSdk 21) when Phase 7 starts.
Theme: emerald + black/white tokens mirrored from `apps/web/app/globals.css`.
