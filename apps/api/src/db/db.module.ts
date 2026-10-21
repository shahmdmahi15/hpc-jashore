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
