// apps/api/src/billing/billing.service.spec.ts
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as schema from '../db/schema';
import { BillingService } from './billing.service';

const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    consultation_fee_paisa INTEGER NOT NULL DEFAULT 50000,
    follow_up_fee_paisa INTEGER NOT NULL DEFAULT 0,
    report_fee_paisa INTEGER NOT NULL DEFAULT 0,
    chamber_room_id TEXT,
    specialization TEXT,
    qualifications TEXT,
    daily_quota INTEGER DEFAULT 40,
    slot_duration_minutes INTEGER DEFAULT 15,
    duty_start_time TEXT,
    duty_end_time TEXT,
    available_days TEXT,
    notes TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    approved_at TEXT,
    approved_by TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES users(id),
    desk_id TEXT,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE cash_drawers (
    id TEXT PRIMARY KEY,
    cashier_staff_id TEXT NOT NULL REFERENCES users(id),
    desk_id TEXT,
    shift_id TEXT REFERENCES shifts(id),
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

  CREATE TABLE drawer_events (
    id TEXT PRIMARY KEY,
    drawer_id TEXT NOT NULL REFERENCES cash_drawers(id),
    event_type TEXT NOT NULL,
    amount_paisa INTEGER NOT NULL,
    description TEXT,
    staff_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id TEXT,
    actor_role TEXT,
    desk_id TEXT,
    pin_staff_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    ip TEXT,
    request_id TEXT
  );

  CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    mrn TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    age_years INTEGER,
    gender TEXT NOT NULL,
    blood_group TEXT,
    address TEXT,
    occupation TEXT,
    emergency_contact TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    contraindications TEXT,
    notes TEXT,
    consent_signed INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    visit_id TEXT,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    cashier_staff_id TEXT REFERENCES users(id),
    subtotal_paisa INTEGER NOT NULL,
    discount_paisa INTEGER NOT NULL DEFAULT 0,
    discount_approved_by TEXT REFERENCES users(id),
    total_paisa INTEGER NOT NULL,
    paid_paisa INTEGER NOT NULL DEFAULT 0,
    due_paisa INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id),
    item_type TEXT NOT NULL,
    item_id TEXT,
    description TEXT NOT NULL,
    unit_price_paisa INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount_paisa INTEGER NOT NULL DEFAULT 0,
    total_paisa INTEGER NOT NULL
  );

  CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id),
    patient_id TEXT NOT NULL REFERENCES patients(id),
    amount_paisa INTEGER NOT NULL,
    method TEXT NOT NULL,
    txn_id TEXT,
    received_by_staff_id TEXT REFERENCES users(id),
    receipt_printed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE dues (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    bill_id TEXT NOT NULL REFERENCES bills(id),
    amount_paisa INTEGER NOT NULL,
    settled_paisa INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE sequences (
    scope TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (scope, year)
  );
`);

const db = drizzle(sqlite, { schema });

const mockAudit: any = { log: async () => {} };
const mockGateway: any = { emit: () => {} };
const mockRealtime: any = { publish: () => {} };

const service = new BillingService(db as any, mockAudit, mockGateway, mockRealtime);

async function runBillingDrawerTests() {
  console.log('Starting Billing Drawer & Desk Resolution Test Suite...');

  const cashierId = 'user-cashier-001';
  sqlite.prepare(`
    INSERT INTO users (id, email, password_hash, role, display_name, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cashierId, 'cashier1@hpc.local', 'hash', 'cashier', 'Primary Cashier', '+8801700000001', 1);

  const actor = { sub: cashierId, role: 'cashier' };
  const meta = { ip: '127.0.0.1', requestId: 'req-test-1' };

  // TEST 1: openDrawer with existing user
  const drawer1 = await service.openDrawer(
    actor,
    cashierId,
    { openingCashPaisa: 500000 },
    meta,
  );
  assert.strictEqual(drawer1.cashierStaffId, cashierId);
  assert.strictEqual(drawer1.openingCashPaisa, 500000);
  assert.strictEqual(drawer1.status, 'open');

  const current1 = await service.getCurrentDrawer(cashierId);
  assert.strictEqual(current1.hasActiveDrawer, true);
  assert.strictEqual(current1.expectedCashInDrawerPaisa, 500000);

  // TEST 2: openDrawer when drawer is already open -> BadRequestException
  await assert.rejects(
    async () => {
      await service.openDrawer(
        actor,
        cashierId,
        { openingCashPaisa: 200000 },
        meta,
      );
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestException, 'Expected BadRequestException');
      assert.match(err.message, /already have an open drawer shift/i);
      return true;
    },
  );

  // TEST 3: closeDrawer with variance calculations
  const closeRes = await service.closeDrawer(
    actor,
    cashierId,
    { closingCashActualPaisa: 495000, varianceReason: 'Cash shortage due to rounding' },
    meta,
  );
  assert.strictEqual(closeRes.ok, true);
  assert.strictEqual(closeRes.openingFloatPaisa, 500000);
  assert.strictEqual(closeRes.expectedCashPaisa, 500000);
  assert.strictEqual(closeRes.actualCashPaisa, 495000);
  assert.strictEqual(closeRes.variancePaisa, -5000);

  // TEST 4: openDrawer again for fresh session
  const drawer2 = await service.openDrawer(
    actor,
    cashierId,
    { openingCashPaisa: 300000 },
    meta,
  );
  assert.strictEqual(drawer2.status, 'open');
  assert.strictEqual(drawer2.openingCashPaisa, 300000);

  await service.closeDrawer(
    actor,
    cashierId,
    { closingCashActualPaisa: 300000 },
    meta,
  );

  console.log('ALL BILLING DRAWER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runBillingDrawerTests().catch((err) => {
  console.error('Billing drawer tests failed:', err);
  process.exit(1);
});
