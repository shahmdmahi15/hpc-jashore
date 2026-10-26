// Global Drizzle database provider. Single SQLite writer: the API always runs
// as ONE process (PM2 instances:1) — never scale this horizontally on SQLite.
import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export const DB = Symbol('DB');
export type Db = BetterSQLite3Database<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Db => {
        const dbPath = config.get<string>('database.path') ?? './data/hpc.db';
        mkdirSync(dirname(dbPath), { recursive: true });
        const sqlite = new Database(dbPath);
        // WAL lets readers proceed during the single writer's transactions.
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');
        sqlite.pragma('busy_timeout = 5000');
        const db = drizzle(sqlite, { schema });
        // dist/db/db.module.js → ../../drizzle = apps/api/drizzle (cwd-independent).
        migrate(db, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });

        // Ensure tv_devices table, bulletins table, and modern columns exist idempotently
        try {
          sqlite.exec(`
            CREATE TABLE IF NOT EXISTS tv_devices (
              id TEXT PRIMARY KEY,
              pairing_code TEXT NOT NULL UNIQUE,
              device_name TEXT NOT NULL,
              location TEXT,
              department TEXT NOT NULL DEFAULT 'ALL',
              theme TEXT NOT NULL DEFAULT 'dark',
              language TEXT NOT NULL DEFAULT 'bn',
              status TEXT NOT NULL DEFAULT 'pending',
              secret_token TEXT,
              ip_address TEXT,
              app_version TEXT,
              force_update INTEGER NOT NULL DEFAULT 0,
              last_seen_at TEXT,
              paired_at TEXT,
              paired_by TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          const tvCols = sqlite.prepare("PRAGMA table_info(tv_devices)").all() as Array<{ name: string }>;
          const tvColNames = new Set(tvCols.map((c) => c.name));
          if (!tvColNames.has('theme')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'");
          }
          if (!tvColNames.has('language')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN language TEXT NOT NULL DEFAULT 'bn'");
          }
          if (!tvColNames.has('department')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN department TEXT NOT NULL DEFAULT 'ALL'");
          }
          if (!tvColNames.has('force_update')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN force_update INTEGER NOT NULL DEFAULT 0");
          }

          // Ensure users table has custom_time_slots column idempotently
          const userCols = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
          const userColNames = new Set(userCols.map((c) => c.name));
          if (!userColNames.has('custom_time_slots')) {
            sqlite.exec("ALTER TABLE users ADD COLUMN custom_time_slots TEXT");
          }

          // Ensure bulletins table exists
          sqlite.exec(`
            CREATE TABLE IF NOT EXISTS bulletins (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              content_en TEXT NOT NULL,
              content_bn TEXT NOT NULL,
              is_urgent INTEGER NOT NULL DEFAULT 0,
              is_active INTEGER NOT NULL DEFAULT 1,
              priority INTEGER NOT NULL DEFAULT 0,
              created_by TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patient_timeline_events (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL REFERENCES patients(id),
              visit_id TEXT REFERENCES visits(id),
              consultation_booking_id TEXT,
              intake_form_id TEXT,
              step TEXT NOT NULL,
              title_en TEXT NOT NULL,
              title_bn TEXT NOT NULL,
              description_en TEXT,
              description_bn TEXT,
              actor_id TEXT,
              actor_name TEXT,
              actor_role TEXT,
              metadata_json TEXT,
              occurred_at TEXT NOT NULL,
              date TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_timeline_patient_date ON patient_timeline_events(patient_id, date);
            CREATE INDEX IF NOT EXISTS idx_timeline_occurred_at ON patient_timeline_events(occurred_at);
          `);

          // Seed default bulletin if none exist
          const bulletinCount = sqlite.prepare("SELECT count(*) as count FROM bulletins").get() as { count: number };
          if (bulletinCount.count === 0) {
            sqlite.exec(`
              INSERT INTO bulletins (id, title, content_en, content_bn, is_urgent, is_active, priority)
              VALUES (
                'default-welcome-1',
                'Welcome to HPC Jashore',
                'Welcome to Health & Pain Care Center · Jashore. Please silence mobile phones during therapy and consultation.',
                'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC) · যশোরে আপনাকে স্বাগতম। থেরাপি এবং পরামর্শের সময় মোবাইল সাইলেন্ট রাখুন।',
                0,
                1,
                10
              );
            `);
          }

          // Clean up legacy desks and beds tables if present
          try {
            sqlite.exec(`
              DROP TABLE IF EXISTS desks;
              DROP TABLE IF EXISTS beds;
            `);
          } catch (dropErr) {
            console.error('Error dropping legacy desks/beds tables:', dropErr);
          }

          // Ensure staff table exists and always mirrors users table so legacy foreign keys to staff never fail
          try {
            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS staff (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL,
                phone TEXT,
                specialization TEXT,
                fee_override_paisa INTEGER,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
            `);

            // Mirror all users into staff where id = user.id and user_id = user.id
            sqlite.exec(`
              INSERT OR REPLACE INTO staff (id, user_id, full_name, role, phone, is_active, created_at, updated_at)
              SELECT 
                u.id, 
                u.id, 
                COALESCE(u.display_name, u.email, 'Staff Member'), 
                u.role, 
                COALESCE(u.phone, ''), 
                COALESCE(u.is_active, 1), 
                COALESCE(u.created_at, CURRENT_TIMESTAMP), 
                COALESCE(u.updated_at, CURRENT_TIMESTAMP)
              FROM users u;
            `);

            // Maintain continuous mirror sync via SQLite triggers
            sqlite.exec(`
              CREATE TRIGGER IF NOT EXISTS trg_sync_users_to_staff_insert
              AFTER INSERT ON users
              BEGIN
                INSERT OR REPLACE INTO staff (id, user_id, full_name, role, phone, is_active, created_at, updated_at)
                VALUES (
                  NEW.id,
                  NEW.id,
                  COALESCE(NEW.display_name, NEW.email, 'Staff Member'),
                  NEW.role,
                  COALESCE(NEW.phone, ''),
                  COALESCE(NEW.is_active, 1),
                  COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
                  COALESCE(NEW.updated_at, CURRENT_TIMESTAMP)
                );
              END;

              CREATE TRIGGER IF NOT EXISTS trg_sync_users_to_staff_update
              AFTER UPDATE ON users
              BEGIN
                INSERT OR REPLACE INTO staff (id, user_id, full_name, role, phone, is_active, created_at, updated_at)
                VALUES (
                  NEW.id,
                  NEW.id,
                  COALESCE(NEW.display_name, NEW.email, 'Staff Member'),
                  NEW.role,
                  COALESCE(NEW.phone, ''),
                  COALESCE(NEW.is_active, 1),
                  COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
                  COALESCE(NEW.updated_at, CURRENT_TIMESTAMP)
                );
              END;
            `);
          } catch (staffSyncErr) {
            console.error('Error ensuring staff mirror table:', staffSyncErr);
          }

          // Migrate cash_drawers table FK to reference users(id) instead of staff(id)
          try {
            const cdFkList = sqlite.prepare("PRAGMA foreign_key_list(cash_drawers)").all() as Array<{ table: string; from: string }>;
            const cdReferencesStaff = cdFkList.some((fk) => fk.table === 'staff');
            if (cdReferencesStaff) {
              sqlite.exec("PRAGMA foreign_keys = OFF;");
              sqlite.exec(`
                CREATE TABLE IF NOT EXISTS _cash_drawers_migrated (
                  id TEXT PRIMARY KEY NOT NULL,
                  cashier_staff_id TEXT NOT NULL REFERENCES users(id),
                  desk_id TEXT,
                  opened_at TEXT NOT NULL,
                  closed_at TEXT,
                  opening_cash_paisa INTEGER NOT NULL,
                  closing_cash_actual_paisa INTEGER,
                  closing_cash_expected_paisa INTEGER,
                  variance_paisa INTEGER,
                  variance_reason TEXT,
                  status TEXT NOT NULL DEFAULT 'open',
                  closed_by_admin_id TEXT REFERENCES users(id),
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
              `);
              sqlite.exec("INSERT OR IGNORE INTO _cash_drawers_migrated SELECT * FROM cash_drawers;");
              sqlite.exec("DROP TABLE cash_drawers;");
              sqlite.exec("ALTER TABLE _cash_drawers_migrated RENAME TO cash_drawers;");
              sqlite.exec("PRAGMA foreign_keys = ON;");
            }
          } catch (cdMigrateErr) {
            console.error('Error migrating cash_drawers FK:', cdMigrateErr);
            sqlite.exec("PRAGMA foreign_keys = ON;");
          }

          // Migrate drawer_events table FK to reference users(id) instead of staff(id)
          try {
            const deFkList = sqlite.prepare("PRAGMA foreign_key_list(drawer_events)").all() as Array<{ table: string; from: string }>;
            const deReferencesStaff = deFkList.some((fk) => fk.table === 'staff');
            if (deReferencesStaff) {
              sqlite.exec("PRAGMA foreign_keys = OFF;");
              sqlite.exec(`
                CREATE TABLE IF NOT EXISTS _drawer_events_migrated (
                  id TEXT PRIMARY KEY NOT NULL,
                  drawer_id TEXT NOT NULL REFERENCES cash_drawers(id),
                  event_type TEXT NOT NULL,
                  amount_paisa INTEGER NOT NULL,
                  description TEXT,
                  staff_id TEXT REFERENCES users(id),
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
              `);
              sqlite.exec("INSERT OR IGNORE INTO _drawer_events_migrated SELECT * FROM drawer_events;");
              sqlite.exec("DROP TABLE drawer_events;");
              sqlite.exec("ALTER TABLE _drawer_events_migrated RENAME TO drawer_events;");
              sqlite.exec("PRAGMA foreign_keys = ON;");
            }
          } catch (deMigrateErr) {
            console.error('Error migrating drawer_events FK:', deMigrateErr);
            sqlite.exec("PRAGMA foreign_keys = ON;");
          }

          // Ensure packages and package_credits schema columns and presets exist idempotently
          try {
            const pkgTableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='packages'").get();
            if (pkgTableCheck) {
              const pkgCols = sqlite.prepare("PRAGMA table_info(packages)").all() as Array<{ name: string }>;
              const pkgColNames = new Set(pkgCols.map((c) => c.name));
              if (!pkgColNames.has('package_type')) {
                sqlite.exec("ALTER TABLE packages ADD COLUMN package_type TEXT NOT NULL DEFAULT 'per_session'");
              }
              if (!pkgColNames.has('total_days')) {
                sqlite.exec("ALTER TABLE packages ADD COLUMN total_days INTEGER NOT NULL DEFAULT 0");
              }
            }

            const pcTableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='package_credits'").get();
            if (pcTableCheck) {
              const pcCols = sqlite.prepare("PRAGMA table_info(package_credits)").all() as Array<{ name: string }>;
              const pcColNames = new Set(pcCols.map((c) => c.name));
              if (!pcColNames.has('remaining_days')) {
                sqlite.exec("ALTER TABLE package_credits ADD COLUMN remaining_days INTEGER NOT NULL DEFAULT 0");
              }
              if (!pcColNames.has('visited_dates_json')) {
                sqlite.exec("ALTER TABLE package_credits ADD COLUMN visited_dates_json TEXT NOT NULL DEFAULT '[]'");
              }
            }

            // Seed preset packages if empty
            const pkgCount = sqlite.prepare("SELECT count(*) as count FROM packages").get() as { count: number };
            if (pkgCount.count === 0) {
              const presetPackages = [
                {
                  id: 'pkg-preset-10-session',
                  name_en: '10-Session Therapy Package',
                  name_bn: '১০-সেশন থেরাপি প্যাকেজ',
                  package_type: 'per_session',
                  total_consultations: 9999,
                  total_therapy_sessions: 10,
                  total_days: 0,
                  validity_days: 30,
                  price_paisa: 1000000, // ৳10,000
                  is_active: 1,
                },
                {
                  id: 'pkg-preset-5-session',
                  name_en: '5-Session Therapy Package',
                  name_bn: '৫-সেশন থেরাপি প্যাকেজ',
                  package_type: 'per_session',
                  total_consultations: 9999,
                  total_therapy_sessions: 5,
                  total_days: 0,
                  validity_days: 15,
                  price_paisa: 600000, // ৳6,000
                  is_active: 1,
                },
                {
                  id: 'pkg-preset-10-day',
                  name_en: '10-Day Complete Rehab Package',
                  name_bn: '১০-দিনের পূর্ণাঙ্গ পুনর্বাসন প্যাকেজ',
                  package_type: 'per_day',
                  total_consultations: 9999,
                  total_therapy_sessions: 9999,
                  total_days: 10,
                  validity_days: 30,
                  price_paisa: 1200000, // ৳12,000
                  is_active: 1,
                },
                {
                  id: 'pkg-preset-15-day',
                  name_en: '15-Day Complete Rehab Package',
                  name_bn: '১৫-দিনের পূর্ণাঙ্গ পুনর্বাসন প্যাকেজ',
                  package_type: 'per_day',
                  total_consultations: 9999,
                  total_therapy_sessions: 9999,
                  total_days: 15,
                  validity_days: 45,
                  price_paisa: 1600000, // ৳16,000
                  is_active: 1,
                },
              ];

              const insertPkgStmt = sqlite.prepare(`
                INSERT OR IGNORE INTO packages (
                  id, name_en, name_bn, package_type,
                  total_consultations, total_therapy_sessions, total_days,
                  validity_days, price_paisa, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `);

              for (const p of presetPackages) {
                insertPkgStmt.run(
                  p.id,
                  p.name_en,
                  p.name_bn,
                  p.package_type,
                  p.total_consultations,
                  p.total_therapy_sessions,
                  p.total_days,
                  p.validity_days,
                  p.price_paisa,
                  p.is_active,
                );
              }
            }
          } catch (pkgErr) {
            console.error('Error migrating or seeding packages:', pkgErr);
          }

          // Ensure fingerprint column in refresh_sessions
          try {
            const sessionCols = sqlite.prepare("PRAGMA table_info(refresh_sessions)").all() as Array<{ name: string }>;
            const sessionColNames = new Set(sessionCols.map((c) => c.name));
            if (!sessionColNames.has('fingerprint')) {
              sqlite.exec("ALTER TABLE refresh_sessions ADD COLUMN fingerprint TEXT");
            }
          } catch {}

          // Ensure email and notes columns in patients
          try {
            const patientCols = sqlite.prepare("PRAGMA table_info(patients)").all() as Array<{ name: string }>;
            const patientColNames = new Set(patientCols.map((c) => c.name));
            if (!patientColNames.has('email')) {
              sqlite.exec("ALTER TABLE patients ADD COLUMN email TEXT");
            }
            if (!patientColNames.has('notes')) {
              sqlite.exec("ALTER TABLE patients ADD COLUMN notes TEXT");
            }
          } catch {}

          // Ensure rooms table & schema columns
          try {
            const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").get() as { name: string } | undefined;
            if (!tableCheck) {
              sqlite.exec(`
                CREATE TABLE rooms (
                  id TEXT PRIMARY KEY,
                  room_number TEXT NOT NULL UNIQUE,
                  code TEXT,
                  name TEXT NOT NULL,
                  type TEXT NOT NULL,
                  gender TEXT NOT NULL DEFAULT 'common',
                  status TEXT NOT NULL DEFAULT 'available',
                  capacity INTEGER NOT NULL DEFAULT 1,
                  notes TEXT,
                  is_active INTEGER NOT NULL DEFAULT 1,
                  deleted_at TEXT,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
              `);
            } else {
              const roomCols = sqlite.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string; notnull: number }>;
              const colMap = new Map(roomCols.map((c) => [c.name, c]));
              const codeCol = colMap.get('code');
              const hasRoomNumber = colMap.has('room_number');
              const hasCapacity = colMap.has('capacity');
              const hasGender = colMap.has('gender');
              const hasStatus = colMap.has('status');

              // If legacy table has code with NOT NULL, or lacks room_number / capacity, migrate table safely
              if ((codeCol && codeCol.notnull === 1) || !hasRoomNumber || !hasCapacity) {
                sqlite.exec("PRAGMA foreign_keys = OFF;");
                sqlite.exec(`
                  CREATE TABLE IF NOT EXISTS _rooms_migrated (
                    id TEXT PRIMARY KEY,
                    room_number TEXT NOT NULL UNIQUE,
                    code TEXT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    gender TEXT NOT NULL DEFAULT 'common',
                    status TEXT NOT NULL DEFAULT 'available',
                    capacity INTEGER NOT NULL DEFAULT 1,
                    notes TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    deleted_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                  );
                `);

                const selRoomNum = hasRoomNumber ? 'room_number' : (colMap.has('code') ? 'code' : 'id');
                const selCode = colMap.has('code') ? 'code' : (hasRoomNumber ? 'room_number' : 'id');
                const selGender = hasGender ? "COALESCE(gender, 'common')" : "'common'";
                const selStatus = hasStatus ? "COALESCE(status, 'available')" : "'available'";
                const selCapacity = hasCapacity ? "COALESCE(capacity, 1)" : "1";
                const selNotes = colMap.has('notes') ? 'notes' : 'NULL';
                const selDeletedAt = colMap.has('deleted_at') ? 'deleted_at' : 'NULL';
                const selCreatedAt = colMap.has('created_at') ? 'COALESCE(created_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
                const selUpdatedAt = colMap.has('updated_at') ? 'COALESCE(updated_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';

                sqlite.exec(`
                  INSERT OR IGNORE INTO _rooms_migrated (
                    id, room_number, code, name, type, gender, status, capacity, notes, is_active, deleted_at, created_at, updated_at
                  )
                  SELECT 
                    id,
                    COALESCE(${selRoomNum}, id) as room_number,
                    COALESCE(${selCode}, ${selRoomNum}, id) as code,
                    name,
                    COALESCE(type, 'waiting_room'),
                    ${selGender},
                    ${selStatus},
                    ${selCapacity},
                    ${selNotes},
                    COALESCE(is_active, 1),
                    ${selDeletedAt},
                    ${selCreatedAt},
                    ${selUpdatedAt}
                  FROM rooms;
                `);

                sqlite.exec("DROP TABLE rooms;");
                sqlite.exec("ALTER TABLE _rooms_migrated RENAME TO rooms;");
                sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);");
                sqlite.exec("PRAGMA foreign_keys = ON;");
              } else {
                if (!hasGender) sqlite.exec("ALTER TABLE rooms ADD COLUMN gender TEXT NOT NULL DEFAULT 'common'");
                if (!hasStatus) sqlite.exec("ALTER TABLE rooms ADD COLUMN status TEXT NOT NULL DEFAULT 'available'");
                if (!hasCapacity) sqlite.exec("ALTER TABLE rooms ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1");
                if (!colMap.has('notes')) sqlite.exec("ALTER TABLE rooms ADD COLUMN notes TEXT");
                if (!colMap.has('is_active')) sqlite.exec("ALTER TABLE rooms ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
                if (!colMap.has('deleted_at')) sqlite.exec("ALTER TABLE rooms ADD COLUMN deleted_at TEXT");
                if (!colMap.has('created_at')) sqlite.exec("ALTER TABLE rooms ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
                if (!colMap.has('updated_at')) sqlite.exec("ALTER TABLE rooms ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
              }
            }

            // Ensure data integrity on existing rows
            sqlite.exec("UPDATE rooms SET room_number = COALESCE(room_number, code, id) WHERE room_number IS NULL OR room_number = ''");
            sqlite.exec("UPDATE rooms SET code = room_number WHERE code IS NULL OR code = ''");
            sqlite.exec("UPDATE rooms SET gender = 'common' WHERE gender IS NULL OR gender = ''");
            sqlite.exec("UPDATE rooms SET status = 'available' WHERE status IS NULL OR status = ''");
            sqlite.exec("UPDATE rooms SET capacity = 1 WHERE capacity IS NULL OR capacity < 1");
            sqlite.exec("UPDATE rooms SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
            sqlite.exec("UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");

            // Seed standard clinic rooms if empty
            const roomCount = sqlite.prepare("SELECT count(*) as count FROM rooms").get() as { count: number };
            if (roomCount.count === 0) {
              const defaultRooms = [
                {
                  id: 'room-wr-01',
                  room_number: 'WR-01',
                  name: 'Main Reception & Waiting Lounge',
                  type: 'waiting_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'Central patient waiting lounge with digital queue monitor and reception intake.',
                },
                {
                  id: 'room-doc-101',
                  room_number: 'DOC-101',
                  name: 'Doctor Consultation Chamber 1',
                  type: 'doctor_consultation_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'Consultation Chamber with diagnostic examination station and prescription screen.',
                },
                {
                  id: 'room-doc-102',
                  room_number: 'DOC-102',
                  name: 'Doctor Consultation Chamber 2',
                  type: 'doctor_consultation_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'General consultation chamber for clinical evaluations and follow-up examinations.',
                },
                {
                  id: 'room-th-01',
                  room_number: 'TH-01',
                  name: 'Male Physiotherapy & Rehab Hall',
                  type: 'therapy_hall',
                  gender: 'male',
                  status: 'available',
                  notes: 'Dedicated male rehabilitation hall equipped with UST, Traction, IFT and Laser units.',
                },
                {
                  id: 'room-th-02',
                  room_number: 'TH-02',
                  name: 'Female Physiotherapy & Rehab Hall',
                  type: 'therapy_hall',
                  gender: 'female',
                  status: 'available',
                  notes: 'Dedicated female rehabilitation hall with privacy screens and female therapy specialists.',
                },
                {
                  id: 'room-tr-01',
                  room_number: 'TR-01',
                  name: 'Private Therapy Suite 1',
                  type: 'private_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'Private acoustic therapy room for specialized manual therapy and needle interventions.',
                },
                {
                  id: 'room-cr-01',
                  room_number: 'CR-01',
                  name: 'Central Billing & Cashier Counter',
                  type: 'cashier_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'POS payment station, 80mm thermal receipt printer, and financial audit desk.',
                },
                {
                  id: 'room-sr-01',
                  room_number: 'SR-01',
                  name: 'Medical Staff & Duty Room',
                  type: 'staff_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'Staff locker room, rest area, and duty roster desk.',
                },
              ];

              for (const r of defaultRooms) {
                sqlite.exec(`
                  INSERT OR IGNORE INTO rooms (id, room_number, name, type, gender, status, notes)
                  VALUES ('${r.id}', '${r.room_number}', '${r.name}', '${r.type}', '${r.gender}', '${r.status}', '${r.notes}');
                `);
              }
            }
          } catch (roomErr) {
            console.error('Error initializing rooms table:', roomErr);
          }

          // Ensure therapy_slot_configs table and default schedule seeding
          try {
            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS therapy_slot_configs (
                id TEXT PRIMARY KEY,
                day TEXT NOT NULL,
                slot_hour TEXT NOT NULL,
                slot_order INTEGER NOT NULL DEFAULT 0,
                slot_male_regular_capacity INTEGER NOT NULL DEFAULT 0,
                slot_female_regular_capacity INTEGER NOT NULL DEFAULT 0,
                slot_male_extra_capacity INTEGER NOT NULL DEFAULT 0,
                slot_female_extra_capacity INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(day, slot_hour)
              );
            `);

            const slotCount = sqlite.prepare("SELECT count(*) as count FROM therapy_slot_configs").get() as { count: number };
            if (slotCount.count === 0) {
              const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
              const slots = [
                '0:00 AM - 1:00 AM',
                '1:00 AM - 2:00 AM',
                '2:00 AM - 3:00 AM',
                '3:00 AM - 4:00 AM',
                '4:00 AM - 5:00 AM',
                '5:00 AM - 6:00 AM',
                '6:00 AM - 7:00 AM',
                '7:00 AM - 8:00 AM',
                '8:00 AM - 9:00 AM',
                '9:00 AM - 10:00 AM',
                '10:00 AM - 11:00 AM',
                '11:00 AM - 12:00 PM',
                '12:00 PM - 1:00 PM',
                '1:00 PM - 2:00 PM',
                '2:00 PM - 3:00 PM',
                '3:00 PM - 4:00 PM',
                '4:00 PM - 5:00 PM',
                '5:00 PM - 6:00 PM',
                '6:00 PM - 7:00 PM',
                '7:00 PM - 8:00 PM',
                '8:00 PM - 9:00 PM',
                '9:00 PM - 10:00 PM',
                '10:00 PM - 11:00 PM',
                '11:00 PM - 12:00 AM',
              ];

              const insertStmt = sqlite.prepare(`
                INSERT OR IGNORE INTO therapy_slot_configs (
                  id, day, slot_hour, slot_order,
                  slot_male_regular_capacity, slot_female_regular_capacity,
                  slot_male_extra_capacity, slot_female_extra_capacity,
                  is_active, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              const seedTransaction = sqlite.transaction(() => {
                for (const day of days) {
                  slots.forEach((slotHour, index) => {
                    const id = `slot-${day.toLowerCase()}-${index}`;
                    const isClinicalHour = index >= 8 && index <= 21;
                    const maleReg = isClinicalHour ? 4 : 0;
                    const femaleReg = isClinicalHour ? 4 : 0;
                    const maleExtra = isClinicalHour ? 1 : 0;
                    const femaleExtra = isClinicalHour ? 1 : 0;
                    const isActive = isClinicalHour ? 1 : 0;
                    const notes = isClinicalHour ? 'Standard clinical therapy slot' : 'Off-peak / closed';

                    insertStmt.run(
                      id,
                      day,
                      slotHour,
                      index,
                      maleReg,
                      femaleReg,
                      maleExtra,
                      femaleExtra,
                      isActive,
                      notes,
                    );
                  });
                }
              });

              seedTransaction();
            }
          } catch (slotErr) {
            console.error('Error initializing therapy_slot_configs table:', slotErr);
          }

          // Ensure therapy_slot_bookings table & indexes
          try {
            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS therapy_slot_bookings (
                id TEXT PRIMARY KEY,
                booking_number TEXT NOT NULL UNIQUE,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                booking_date TEXT NOT NULL,
                day_of_week TEXT NOT NULL,
                slot_hour TEXT NOT NULL,
                told_time TEXT,
                patient_gender TEXT NOT NULL,
                capacity_type TEXT NOT NULL DEFAULT 'regular',
                status TEXT NOT NULL DEFAULT 'booked',
                notes TEXT,
                booked_by TEXT REFERENCES users(id),
                deleted_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_tsb_date_slot ON therapy_slot_bookings(booking_date, slot_hour);
              CREATE INDEX IF NOT EXISTS idx_tsb_patient ON therapy_slot_bookings(patient_id);
              CREATE INDEX IF NOT EXISTS idx_tsb_status ON therapy_slot_bookings(status);
            `);

            const bookingCols = sqlite.prepare("PRAGMA table_info(therapy_slot_bookings)").all() as Array<{ name: string }>;
            const bookingColNames = new Set(bookingCols.map((c) => c.name));
            if (!bookingColNames.has('checked_in_at')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN checked_in_at TEXT");
            }
            if (!bookingColNames.has('punctuality_status')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN punctuality_status TEXT");
            }
            if (!bookingColNames.has('delay_minutes')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN delay_minutes INTEGER");
            }
            if (!bookingColNames.has('approval_status')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN approval_status TEXT");
            }
            if (!bookingColNames.has('approved_by')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN approved_by TEXT");
            }
            if (!bookingColNames.has('approved_at')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN approved_at TEXT");
            }
            if (!bookingColNames.has('rejected_by')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN rejected_by TEXT");
            }
            if (!bookingColNames.has('rejected_at')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN rejected_at TEXT");
            }
            if (!bookingColNames.has('rejection_reason')) {
              sqlite.exec("ALTER TABLE therapy_slot_bookings ADD COLUMN rejection_reason TEXT");
            }
          } catch (bookingErr) {
            console.error('Error initializing therapy_slot_bookings table:', bookingErr);
          }

          // Ensure visits punctuality & room columns
          try {
            const visitCols = sqlite.prepare("PRAGMA table_info(visits)").all() as Array<{ name: string }>;
            const visitColNames = new Set(visitCols.map((c) => c.name));
            if (!visitColNames.has('told_time')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN told_time TEXT");
            }
            if (!visitColNames.has('punctuality_status')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN punctuality_status TEXT");
            }
            if (!visitColNames.has('delay_minutes')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN delay_minutes INTEGER");
            }
            if (!visitColNames.has('therapy_booking_id')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN therapy_booking_id TEXT");
            }
            if (!visitColNames.has('room_id')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN room_id TEXT");
            }
          } catch {}

          // Ensure doctor configuration and fee columns directly on users table
          try {
            const userCols = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
            const userColNames = new Set(userCols.map((c) => c.name));
            if (!userColNames.has('consultation_fee_paisa')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN consultation_fee_paisa INTEGER NOT NULL DEFAULT 50000");
            }
            if (!userColNames.has('follow_up_fee_paisa')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN follow_up_fee_paisa INTEGER NOT NULL DEFAULT 0");
            }
            if (!userColNames.has('report_fee_paisa')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN report_fee_paisa INTEGER NOT NULL DEFAULT 0");
            }
            if (!userColNames.has('chamber_room_id')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN chamber_room_id TEXT");
            }
            if (!userColNames.has('specialization')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN specialization TEXT");
            }
            if (!userColNames.has('qualifications')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN qualifications TEXT");
            }
            if (!userColNames.has('daily_quota')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN daily_quota INTEGER DEFAULT 40");
            }
            if (!userColNames.has('slot_duration_minutes')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN slot_duration_minutes INTEGER DEFAULT 15");
            }
            if (!userColNames.has('duty_start_time')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN duty_start_time TEXT");
            }
            if (!userColNames.has('duty_end_time')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN duty_end_time TEXT");
            }
            if (!userColNames.has('available_days')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN available_days TEXT");
            }
            if (!userColNames.has('notes')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN notes TEXT");
            }
            if (!userColNames.has('is_approved')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 1");
            }
            if (!userColNames.has('approval_status')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'");
            }
            if (!userColNames.has('approved_at')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN approved_at TEXT");
            }
            if (!userColNames.has('approved_by')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN approved_by TEXT");
            }
            if (!userColNames.has('rejection_reason')) {
              sqlite.exec("ALTER TABLE users ADD COLUMN rejection_reason TEXT");
            }

            // Sync legacy staff fee and chamber data to users table for doctors if staff table exists
            const hasStaff = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff'").get();
            if (hasStaff) {
              sqlite.exec(`
                UPDATE users 
                SET 
                  consultation_fee_paisa = COALESCE((SELECT consultation_fee_paisa FROM staff WHERE staff.user_id = users.id AND staff.consultation_fee_paisa IS NOT NULL LIMIT 1), users.consultation_fee_paisa, 50000),
                  follow_up_fee_paisa = COALESCE((SELECT follow_up_fee_paisa FROM staff WHERE staff.user_id = users.id AND staff.follow_up_fee_paisa IS NOT NULL LIMIT 1), users.follow_up_fee_paisa, 0),
                  report_fee_paisa = COALESCE((SELECT report_fee_paisa FROM staff WHERE staff.user_id = users.id AND staff.report_fee_paisa IS NOT NULL LIMIT 1), users.report_fee_paisa, 0),
                  chamber_room_id = COALESCE((SELECT chamber_room_id FROM staff WHERE staff.user_id = users.id AND staff.chamber_room_id IS NOT NULL LIMIT 1), users.chamber_room_id)
                WHERE users.role = 'doctor';
              `);
            }
          } catch (userColErr) {
            console.error('Error initializing doctor columns on users table:', userColErr);
          }

          // Ensure consultation_bookings table
          try {
            // Check if consultation_bookings has legacy FK referencing staff
            try {
              const consultFks = sqlite.prepare("PRAGMA foreign_key_list(consultation_bookings)").all() as Array<{ table: string }>;
              if (consultFks.some((f) => f.table === 'staff')) {
                sqlite.exec(`
                  PRAGMA foreign_keys = OFF;
                  CREATE TABLE IF NOT EXISTS _migrated_consultation_bookings (
                    id TEXT PRIMARY KEY,
                    booking_number TEXT NOT NULL UNIQUE,
                    patient_id TEXT NOT NULL REFERENCES patients(id),
                    doctor_id TEXT NOT NULL,
                    booking_date TEXT NOT NULL,
                    slot_time TEXT NOT NULL,
                    told_time TEXT,
                    visit_type TEXT NOT NULL DEFAULT 'new_consultation',
                    fee_paisa INTEGER NOT NULL DEFAULT 50000,
                    serial_number INTEGER,
                    status TEXT NOT NULL DEFAULT 'booked',
                    checked_in_at TEXT,
                    punctuality_status TEXT,
                    delay_minutes INTEGER,
                    in_queue_at TEXT,
                    queued_by TEXT REFERENCES users(id),
                    serial_id TEXT REFERENCES serials(id),
                    visit_id TEXT REFERENCES visits(id),
                    cancelled_at TEXT,
                    cancelled_by TEXT REFERENCES users(id),
                    cancellation_reason TEXT,
                    notes TEXT,
                    booked_by TEXT REFERENCES users(id),
                    deleted_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                  );
                  INSERT OR IGNORE INTO _migrated_consultation_bookings SELECT * FROM consultation_bookings;
                  DROP TABLE consultation_bookings;
                  ALTER TABLE _migrated_consultation_bookings RENAME TO consultation_bookings;
                  CREATE INDEX IF NOT EXISTS idx_consultation_bookings_doc_date ON consultation_bookings(doctor_id, booking_date);
                  CREATE INDEX IF NOT EXISTS idx_consultation_bookings_patient ON consultation_bookings(patient_id);
                  CREATE INDEX IF NOT EXISTS idx_consultation_bookings_status ON consultation_bookings(status);
                  PRAGMA foreign_keys = ON;
                `);
              }
            } catch (migErr) {
              console.warn('Consultation bookings migration note:', migErr);
            }

            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS consultation_bookings (
                id TEXT PRIMARY KEY,
                booking_number TEXT NOT NULL UNIQUE,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                doctor_id TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                slot_time TEXT NOT NULL,
                told_time TEXT,
                visit_type TEXT NOT NULL DEFAULT 'new_consultation',
                fee_paisa INTEGER NOT NULL DEFAULT 50000,
                serial_number INTEGER,
                status TEXT NOT NULL DEFAULT 'booked',
                checked_in_at TEXT,
                punctuality_status TEXT,
                delay_minutes INTEGER,
                in_queue_at TEXT,
                queued_by TEXT REFERENCES users(id),
                serial_id TEXT REFERENCES serials(id),
                visit_id TEXT REFERENCES visits(id),
                cancelled_at TEXT,
                cancelled_by TEXT REFERENCES users(id),
                cancellation_reason TEXT,
                notes TEXT,
                booked_by TEXT REFERENCES users(id),
                deleted_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_consultation_bookings_doc_date ON consultation_bookings(doctor_id, booking_date);
              CREATE INDEX IF NOT EXISTS idx_consultation_bookings_patient ON consultation_bookings(patient_id);
              CREATE INDEX IF NOT EXISTS idx_consultation_bookings_status ON consultation_bookings(status);
            `);
          } catch {}

          // Ensure new visit checkout & consultation columns
          try {
            const visitCols = sqlite.prepare("PRAGMA table_info(visits)").all() as Array<{ name: string }>;
            const visitColNames = new Set(visitCols.map((c) => c.name));
            if (!visitColNames.has('consultation_booking_id')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN consultation_booking_id TEXT");
            }
            if (!visitColNames.has('discharge_notes')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN discharge_notes TEXT");
            }
            if (!visitColNames.has('next_follow_up_date')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN next_follow_up_date TEXT");
            }
            if (!visitColNames.has('cleared_by')) {
              sqlite.exec("ALTER TABLE visits ADD COLUMN cleared_by TEXT");
            }
          } catch {}

          // Ensure patient_intake_forms and patient_timeline_events tables
          try {
            // Check if patient_intake_forms has legacy FK referencing staff
            try {
              const intakeFks = sqlite.prepare("PRAGMA foreign_key_list(patient_intake_forms)").all() as Array<{ table: string }>;
              if (intakeFks.some((f) => f.table === 'staff')) {
                sqlite.exec(`
                  PRAGMA foreign_keys = OFF;
                  CREATE TABLE IF NOT EXISTS _migrated_intake (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL REFERENCES patients(id),
                    visit_id TEXT,
                    consultation_booking_id TEXT,
                    doctor_id TEXT,
                    receptionist_id TEXT,
                    receptionist_name TEXT,
                    date TEXT NOT NULL,
                    name TEXT NOT NULL,
                    age_years INTEGER,
                    phone TEXT NOT NULL,
                    gender TEXT NOT NULL DEFAULT 'male',
                    occupation TEXT,
                    address TEXT,
                    bp_systolic INTEGER,
                    bp_diastolic INTEGER,
                    blood_sugar TEXT,
                    has_diabetes INTEGER NOT NULL DEFAULT 0,
                    weight_kg TEXT,
                    chief_complaint TEXT,
                    problem_duration TEXT,
                    seen_doctor_before INTEGER NOT NULL DEFAULT 0,
                    previous_doctor_details TEXT,
                    has_previous_reports INTEGER NOT NULL DEFAULT 0,
                    previous_report_names TEXT,
                    takes_regular_medication INTEGER NOT NULL DEFAULT 0,
                    regular_medication_details TEXT,
                    has_drug_allergies INTEGER NOT NULL DEFAULT 0,
                    drug_allergy_details TEXT,
                    referral_source TEXT,
                    referral_other_details TEXT,
                    special_notes TEXT,
                    status TEXT NOT NULL DEFAULT 'submitted',
                    forwarded_to_cashier_at TEXT,
                    billed_at TEXT,
                    queued_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                  );
                  INSERT OR IGNORE INTO _migrated_intake SELECT * FROM patient_intake_forms;
                  DROP TABLE patient_intake_forms;
                  ALTER TABLE _migrated_intake RENAME TO patient_intake_forms;
                  CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_patient ON patient_intake_forms(patient_id);
                  CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_date ON patient_intake_forms(date);
                  CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_status ON patient_intake_forms(status);
                  CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_doctor ON patient_intake_forms(doctor_id);
                  PRAGMA foreign_keys = ON;
                `);
              }
            } catch (migErr) {
              console.warn('Intake table migration note:', migErr);
            }

            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS patient_intake_forms (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                visit_id TEXT REFERENCES visits(id),
                consultation_booking_id TEXT,
                doctor_id TEXT,
                receptionist_id TEXT REFERENCES users(id),
                receptionist_name TEXT,
                date TEXT NOT NULL,
                name TEXT NOT NULL,
                age_years INTEGER,
                phone TEXT NOT NULL,
                gender TEXT NOT NULL DEFAULT 'male',
                occupation TEXT,
                address TEXT,
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                blood_sugar TEXT,
                has_diabetes INTEGER NOT NULL DEFAULT 0,
                weight_kg TEXT,
                chief_complaint TEXT,
                problem_duration TEXT,
                seen_doctor_before INTEGER NOT NULL DEFAULT 0,
                previous_doctor_details TEXT,
                has_previous_reports INTEGER NOT NULL DEFAULT 0,
                previous_report_names TEXT,
                takes_regular_medication INTEGER NOT NULL DEFAULT 0,
                regular_medication_details TEXT,
                has_drug_allergies INTEGER NOT NULL DEFAULT 0,
                drug_allergy_details TEXT,
                referral_source TEXT,
                referral_other_details TEXT,
                special_notes TEXT,
                status TEXT NOT NULL DEFAULT 'submitted',
                forwarded_to_cashier_at TEXT,
                billed_at TEXT,
                queued_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_patient ON patient_intake_forms(patient_id);
              CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_date ON patient_intake_forms(date);
              CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_status ON patient_intake_forms(status);
              CREATE INDEX IF NOT EXISTS idx_patient_intake_forms_doctor ON patient_intake_forms(doctor_id);

              CREATE TABLE IF NOT EXISTS patient_timeline_events (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                visit_id TEXT,
                consultation_booking_id TEXT,
                intake_form_id TEXT,
                step TEXT NOT NULL,
                title_en TEXT NOT NULL,
                title_bn TEXT NOT NULL,
                description_en TEXT,
                description_bn TEXT,
                actor_id TEXT,
                actor_name TEXT,
                actor_role TEXT,
                metadata_json TEXT,
                occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                date TEXT NOT NULL
              );
              CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_date ON patient_timeline_events(patient_id, date);
              CREATE INDEX IF NOT EXISTS idx_patient_timeline_occurred ON patient_timeline_events(occurred_at);

              CREATE TABLE IF NOT EXISTS patient_assessment_files (
                id TEXT PRIMARY KEY,
                file_number TEXT NOT NULL UNIQUE,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                doctor_id TEXT,
                doctor_name TEXT,
                visit_id TEXT,
                assessment_date TEXT NOT NULL,
                name TEXT NOT NULL,
                age TEXT,
                gender TEXT,
                id_no TEXT,
                occupation TEXT,
                address TEXT,
                mobile TEXT,
                pain_areas TEXT,
                pain_area_others TEXT,
                side TEXT,
                duration TEXT,
                pain_types TEXT,
                vas_score INTEGER NOT NULL DEFAULT 0,
                pain_increases_with TEXT,
                pain_reduces_with TEXT,
                injury_accident TEXT DEFAULT 'no',
                injury_details TEXT,
                posture_advice TEXT DEFAULT 'no',
                posture_habits TEXT,
                surgery_history TEXT DEFAULT 'no',
                surgery_details TEXT,
                previous_treatment TEXT,
                previous_treatment_details TEXT,
                functional_limitations TEXT,
                functional_notes TEXT,
                rom TEXT DEFAULT 'Normal',
                muscle_spasm TEXT DEFAULT 'no',
                tenderness TEXT DEFAULT 'no',
                swelling TEXT DEFAULT 'no',
                physical_exam_notes TEXT,
                diagnosis TEXT,
                treatment_plans TEXT,
                treatment_plan_notes TEXT,
                prescribed_sessions INTEGER,
                exercise_explained TEXT DEFAULT 'no',
                home_posture_advice TEXT DEFAULT 'no',
                home_advice_notes TEXT,
                pain_scale_after_treatment INTEGER,
                improvement TEXT,
                therapist_signature TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_assessment_files_patient ON patient_assessment_files(patient_id);
              CREATE INDEX IF NOT EXISTS idx_assessment_files_date ON patient_assessment_files(assessment_date);
              CREATE INDEX IF NOT EXISTS idx_assessment_files_doctor ON patient_assessment_files(doctor_id);
            `);
          } catch (intakeErr) {
            console.error('Error creating patient assessment, intake, and timeline tables:', intakeErr);
          }

          // Safely ensure medicines columns exist for simplified direct inventory
          try {
            sqlite.exec(`
              ALTER TABLE medicines ADD COLUMN current_stock INTEGER NOT NULL DEFAULT 0;
            `);
          } catch {}
          try {
            sqlite.exec(`
              ALTER TABLE medicines ADD COLUMN mrp_paisa INTEGER NOT NULL DEFAULT 0;
            `);
          } catch {}

          // Safely clean up removed legacy tables (preserve staff mirror table for legacy foreign keys & triggers)
          try {
            sqlite.exec(`
              DROP TABLE IF EXISTS pin_credentials;
              DROP TABLE IF EXISTS action_grants;
              DROP TABLE IF EXISTS shifts;
              DROP TABLE IF EXISTS attendance;
              DROP TABLE IF EXISTS machines;
              DROP TABLE IF EXISTS batches;
            `);
          } catch {}

          // Clean up orphan active serials where visit is already checked out or cancelled,
          // and establish SQLite triggers so visits checkout atomically and permanently completes serials.
          try {
            sqlite.exec(`
              UPDATE serials
              SET status = 'completed',
                  completed_at = COALESCE(completed_at, datetime('now')),
                  updated_at = datetime('now')
              WHERE status IN ('waiting', 'called', 'in_chamber')
                AND visit_id IN (
                  SELECT id FROM visits
                  WHERE status IN ('checked_out', 'cancelled')
                     OR checked_out_at IS NOT NULL
                );

              CREATE TRIGGER IF NOT EXISTS trg_cleanup_serials_on_visit_checkout
              AFTER UPDATE OF status, checked_out_at ON visits
              WHEN NEW.status = 'checked_out' OR NEW.checked_out_at IS NOT NULL
              BEGIN
                UPDATE serials
                SET status = 'completed',
                    completed_at = COALESCE(completed_at, datetime('now')),
                    updated_at = datetime('now')
                WHERE visit_id = NEW.id
                  AND status IN ('waiting', 'called', 'in_chamber');
              END;

              CREATE TRIGGER IF NOT EXISTS trg_cleanup_serials_on_visit_cancelled
              AFTER UPDATE OF status ON visits
              WHEN NEW.status = 'cancelled'
              BEGIN
                UPDATE serials
                SET status = 'completed',
                    completed_at = COALESCE(completed_at, datetime('now')),
                    updated_at = datetime('now')
                WHERE visit_id = NEW.id
                  AND status IN ('waiting', 'called', 'in_chamber');
              END;
            `);
          } catch (serialCleanErr) {
            console.error('Error ensuring serial checkout triggers and cleanup:', serialCleanErr);
          }
        } catch {
          // Idempotent column safety
        }

        return db;
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnModuleInit {
  onModuleInit() {
    // Migration runs inside the DB provider factory so the schema exists
    // before any service (including the seeder) touches the database.
  }
}
