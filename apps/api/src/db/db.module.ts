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
            sqlite.exec(`
              CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                room_number TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                gender TEXT NOT NULL DEFAULT 'common',
                status TEXT NOT NULL DEFAULT 'available',
                notes TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                deleted_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
            `);

            const roomCols = sqlite.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
            const roomColNames = new Set(roomCols.map((c) => c.name));
            if (!roomColNames.has('room_number')) {
              sqlite.exec("ALTER TABLE rooms ADD COLUMN room_number TEXT");
              if (roomColNames.has('code')) {
                sqlite.exec("UPDATE rooms SET room_number = code WHERE room_number IS NULL");
              }
            }
            if (!roomColNames.has('gender')) {
              sqlite.exec("ALTER TABLE rooms ADD COLUMN gender TEXT NOT NULL DEFAULT 'common'");
            }
            if (!roomColNames.has('status')) {
              sqlite.exec("ALTER TABLE rooms ADD COLUMN status TEXT NOT NULL DEFAULT 'available'");
            }
            if (!roomColNames.has('notes')) {
              sqlite.exec("ALTER TABLE rooms ADD COLUMN notes TEXT");
            }
            if (!roomColNames.has('deleted_at')) {
              sqlite.exec("ALTER TABLE rooms ADD COLUMN deleted_at TEXT");
            }

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
                  name: 'Doctor Consultation Chamber 1 (Dr. Toufiq)',
                  type: 'doctor_consultation_room',
                  gender: 'common',
                  status: 'available',
                  notes: 'Chief Consultant Chamber with diagnostic examination station and prescription screen.',
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
          } catch {}
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
