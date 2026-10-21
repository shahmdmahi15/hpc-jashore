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

        // Ensure tv_devices table and modern columns exist idempotently
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
              last_seen_at TEXT,
              paired_at TEXT,
              paired_by TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          const cols = sqlite.prepare("PRAGMA table_info(tv_devices)").all() as Array<{ name: string }>;
          const colNames = new Set(cols.map((c) => c.name));
          if (!colNames.has('theme')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'");
          }
          if (!colNames.has('language')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN language TEXT NOT NULL DEFAULT 'bn'");
          }
          if (!colNames.has('department')) {
            sqlite.exec("ALTER TABLE tv_devices ADD COLUMN department TEXT NOT NULL DEFAULT 'ALL'");
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
