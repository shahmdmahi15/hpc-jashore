// MRN + numbering utilities. Format locked: HPC-2026-00001 (year-prefixed sequence).
// Bills/tokens reuse the same `sequences` pattern with their own scope.
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { patients, sequences } from '../db/schema';

const MRN_RE = /^HPC-(?:\d{4}|\d{2})-\d{5}$/;

export function formatMrn(fullYear: number, value: number): string {
  return `HPC-${fullYear}-${String(value).padStart(5, '0')}`;
}

export function isValidMrn(mrn: string): boolean {
  return MRN_RE.test(mrn);
}

// Atomically increments sequences(scope, year) and returns the formatted MRN.
// Runs inside a single SQLite transaction on the single writer — no duplicates.
export function nextMrn(db: Db, fullYear = new Date().getFullYear()): string {
  return db.transaction((tx) => {
    const where = and(
      eq(sequences.scope, 'mrn'),
      eq(sequences.year, fullYear),
    );
    const existing = tx.select().from(sequences).where(where).get();
    let next = (existing?.lastValue ?? 0) + 1;

    // Self-healing check: ensure next is greater than any existing MRN in the patients table
    const yy = String(fullYear).slice(-2);
    const prefix4 = `HPC-${fullYear}-`;
    const prefix2 = `HPC-${yy}-`;
    const highestPatient = tx
      .select({ mrn: patients.mrn })
      .from(patients)
      .where(sql`${patients.mrn} LIKE ${prefix4 + '%'} OR ${patients.mrn} LIKE ${prefix2 + '%'}`)
      .orderBy(sql`${patients.mrn} DESC`)
      .limit(1)
      .get();

    if (highestPatient?.mrn) {
      const match = highestPatient.mrn.match(/HPC-(?:\d{4}|\d{2})-(\d+)/);
      if (match) {
        const highestNum = parseInt(match[1], 10);
        if (highestNum >= next) {
          next = highestNum + 1;
        }
      }
    }

    if (existing) {
      tx.update(sequences).set({ lastValue: next }).where(where).run();
    } else {
      tx.insert(sequences).values({ scope: 'mrn', year: fullYear, lastValue: next }).run();
    }
    return formatMrn(fullYear, next);
  });
}
