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
