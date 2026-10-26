// Runnable with: pnpm --filter @hpc/api test:mrn (ts-node, no test runner needed).
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import { formatMrn, isValidMrn, nextMrn } from './mrn.util';

assert.strictEqual(formatMrn(2026, 1), 'HPC-2026-00001');
assert.strictEqual(formatMrn(2026, 12345), 'HPC-2026-12345');
assert.ok(isValidMrn('HPC-2026-00001'));
assert.ok(isValidMrn('HPC-26-00001'));
assert.ok(!isValidMrn('HPC-2026-1'));
assert.ok(!isValidMrn('hpc-2026-00001'));

const sqlite = new Database(':memory:');
sqlite.exec(
  'CREATE TABLE sequences (scope TEXT NOT NULL, year INTEGER NOT NULL, last_value INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (scope, year)); CREATE TABLE patients (mrn TEXT);',
);
const db = drizzle(sqlite, { schema });

assert.strictEqual(nextMrn(db, 2026), 'HPC-2026-00001');
assert.strictEqual(nextMrn(db, 2026), 'HPC-2026-00002');
assert.strictEqual(nextMrn(db, 2027), 'HPC-2027-00001'); // year rollover

sqlite.close();
// eslint-disable-next-line no-console
console.log('mrn.util: all assertions passed');
process.exit(0);
