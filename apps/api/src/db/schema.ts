// Phase 1 database schema — Drizzle ORM over SQLite (WAL, single writer).
// Conventions: TEXT ids (uuid v4 generated in code), ISO-8601 TEXT timestamps,
// money as INTEGER paisa, booleans as INTEGER 0/1, JSON blobs as TEXT.
import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export type Role =
  | 'admin'
  | 'doctor'
  | 'handler'
  | 'cashier'
  | 'receptionist';

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
};

// --- Identity & access -------------------------------------------------------

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().$type<Role>(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  isActive: integer('is_active').notNull().default(1),
  mustChangePassword: integer('must_change_password').notNull().default(1),
  ...timestamps,
});

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  // Nullable: PIN-only desk staff may have no personal login.
  userId: text('user_id').references(() => users.id),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().$type<Role>(),
  phone: text('phone'),
  specialization: text('specialization'),
  feeOverridePaisa: integer('fee_override_paisa'),
  isActive: integer('is_active').notNull().default(1),
  ...timestamps,
});

export const desks = sqliteTable('desks', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull().$type<'reception' | 'therapy' | 'cashier'>(),
  name: text('name').notNull(),
  roomId: text('room_id').references(() => rooms.id),
  isActive: integer('is_active').notNull().default(1),
});

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  staffId: text('staff_id')
    .notNull()
    .references(() => staff.id),
  deskId: text('desk_id').references(() => desks.id),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at'),
  status: text('status').notNull().default('scheduled'),
  ...timestamps,
});

export const pinCredentials = sqliteTable('pin_credentials', {
  staffId: text('staff_id')
    .primaryKey()
    .references(() => staff.id),
  pinHash: text('pin_hash').notNull(),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedBy: text('updated_by').references(() => users.id),
});

// Long-lived refresh sessions (device list + remote logout + rotation chain).
export const refreshSessions = sqliteTable('refresh_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  deviceLabel: text('device_label'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  rotatedFromId: text('rotated_from_id'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Short-lived desk action grants issued by PIN verification (60 s TTL).
export const actionGrants = sqliteTable('action_grants', {
  id: text('id').primaryKey(), // = JWT jti
  staffId: text('staff_id')
    .notNull()
    .references(() => staff.id),
  deskId: text('desk_id')
    .notNull()
    .references(() => desks.id),
  scope: text('scope').notNull().default('desk:action'),
  issuedAt: text('issued_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
});

// --- Numbering (MRN, bills, tokens share this pattern) ------------------------

export const sequences = sqliteTable(
  'sequences',
  {
    scope: text('scope').notNull(), // 'mrn' | 'bill' | 'token' ...
    year: integer('year').notNull(), // full year, e.g. 2026
    lastValue: integer('last_value').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.scope, t.year] })],
);

// --- Audit (immutable, append-only by convention) ------------------------------

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  occurredAt: text('occurred_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  actorUserId: text('actor_user_id'),
  actorRole: text('actor_role'),
  deskId: text('desk_id'),
  pinStaffId: text('pin_staff_id'),
  action: text('action').notNull(), // e.g. 'users.create', 'auth.pin_verify'
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  ip: text('ip'),
  requestId: text('request_id'),
});

// --- Catalog & settings --------------------------------------------------------

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const modalities = sqliteTable('modalities', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  defaultDurationMin: integer('default_duration_min').notNull(),
  defaultPricePaisa: integer('default_price_paisa').notNull(),
  isActive: integer('is_active').notNull().default(1),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull().$type<'consult' | 'therapy' | 'counter'>(),
  isActive: integer('is_active').notNull().default(1),
});

// --- Phase 2: Patient Directory, Visits, Serials, Appointments ----------------

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  mrn: text('mrn').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn'),
  phone: text('phone').notNull().unique(),
  dateOfBirth: text('date_of_birth'),
  ageYears: integer('age_years'),
  gender: text('gender').notNull().$type<'male' | 'female' | 'other'>(),
  bloodGroup: text('blood_group'),
  address: text('address'),
  occupation: text('occupation'),
  emergencyContact: text('emergency_contact'),
  allergies: text('allergies'),
  chronicConditions: text('chronic_conditions'),
  contraindications: text('contraindications'),
  photoUrl: text('photo_url'),
  consentSigned: integer('consent_signed').notNull().default(0),
  deletedAt: text('deleted_at'),
  ...timestamps,
});

export const visits = sqliteTable('visits', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id').references(() => staff.id),
  tokenNumber: integer('token_number').notNull(),
  visitDate: text('visit_date').notNull(),
  status: text('status')
    .notNull()
    .$type<
      | 'scheduled'
      | 'checked_in'
      | 'in_consult'
      | 'in_therapy'
      | 'billed'
      | 'checked_out'
      | 'cancelled'
      | 'no_show'
    >()
    .default('checked_in'),
  priority: text('priority')
    .notNull()
    .$type<'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly'>()
    .default('normal'),
  currentLocation: text('current_location').default('reception'),
  checkedInAt: text('checked_in_at'),
  checkedOutAt: text('checked_out_at'),
  notes: text('notes'),
  ...timestamps,
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => staff.id),
  slotTime: text('slot_time').notNull(),
  status: text('status')
    .notNull()
    .$type<'booked' | 'confirmed' | 'arrived' | 'cancelled' | 'no_show'>()
    .default('booked'),
  notes: text('notes'),
  ...timestamps,
});

export const serials = sqliteTable('serials', {
  id: text('id').primaryKey(),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => staff.id),
  date: text('date').notNull(),
  serialNumber: integer('serial_number').notNull(),
  visitId: text('visit_id')
    .notNull()
    .references(() => visits.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  status: text('status')
    .notNull()
    .$type<'waiting' | 'called' | 'in_chamber' | 'completed' | 'skipped'>()
    .default('waiting'),
  calledAt: text('called_at'),
  completedAt: text('completed_at'),
  ...timestamps,
});

// --- Phase 3: Consultations, Prescriptions, Physio Assessments ----------------

export const consultations = sqliteTable('consultations', {
  id: text('id').primaryKey(),
  visitId: text('visit_id')
    .notNull()
    .references(() => visits.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => staff.id),
  chiefComplaints: text('chief_complaints'),
  history: text('history'),
  vitalsJson: text('vitals_json'),
  painScoreVas: integer('pain_score_vas'),
  soapNotesJson: text('soap_notes_json'),
  diagnosisIcdJson: text('diagnosis_icd_json'),
  investigationsAdvisedJson: text('investigations_advised_json'),
  followUpDate: text('follow_up_date'),
  ...timestamps,
});

export const prescriptions = sqliteTable('prescriptions', {
  id: text('id').primaryKey(),
  consultationId: text('consultation_id').references(() => consultations.id),
  visitId: text('visit_id')
    .notNull()
    .references(() => visits.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => staff.id),
  advice: text('advice'),
  ...timestamps,
});

export const prescriptionItems = sqliteTable('prescription_items', {
  id: text('id').primaryKey(),
  prescriptionId: text('prescription_id')
    .notNull()
    .references(() => prescriptions.id),
  medicineId: text('medicine_id').references(() => medicines.id),
  medicineName: text('medicine_name').notNull(),
  dosage: text('dosage').notNull(),
  durationDays: integer('duration_days').notNull().default(7),
  instructionsBn: text('instructions_bn'),
  instructionsEn: text('instructions_en'),
  isDispensed: integer('is_dispensed').notNull().default(0),
});

export const assessments = sqliteTable('assessments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  consultationId: text('consultation_id').references(() => consultations.id),
  templateType: text('template_type')
    .notNull()
    .$type<'low_back' | 'neck' | 'knee' | 'shoulder' | 'neuro'>(),
  scoreJson: text('score_json').notNull(),
  totalScore: integer('total_score').notNull(),
  outcomeNotes: text('outcome_notes'),
  ...timestamps,
});

// --- Phase 4: Therapy Plans, Sessions, Beds, Machines & Packages -------------

export const therapyPlans = sqliteTable('therapy_plans', {
  id: text('id').primaryKey(),
  consultationId: text('consultation_id').references(() => consultations.id),
  visitId: text('visit_id').references(() => visits.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => staff.id),
  modalityCode: text('modality_code')
    .notNull()
    .references(() => modalities.code),
  totalSessionsPrescribed: integer('total_sessions_prescribed')
    .notNull()
    .default(1),
  completedSessions: integer('completed_sessions').notNull().default(0),
  frequency: text('frequency').default('daily'),
  notes: text('notes'),
  status: text('status')
    .notNull()
    .$type<'active' | 'completed' | 'cancelled'>()
    .default('active'),
  ...timestamps,
});

export const beds = sqliteTable('beds', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  isActive: integer('is_active').notNull().default(1),
});

export const machines = sqliteTable('machines', {
  id: text('id').primaryKey(),
  roomId: text('room_id').references(() => rooms.id),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  modalityCode: text('modality_code').references(() => modalities.code),
  status: text('status')
    .notNull()
    .$type<'available' | 'in_use' | 'maintenance'>()
    .default('available'),
  lastServicedAt: text('last_serviced_at'),
  nextServiceDue: text('next_service_due'),
  isActive: integer('is_active').notNull().default(1),
});

export const therapySessions = sqliteTable('therapy_sessions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').references(() => therapyPlans.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  therapistStaffId: text('therapist_staff_id').references(() => staff.id),
  bedId: text('bed_id').references(() => beds.id),
  machineId: text('machine_id').references(() => machines.id),
  modalityCode: text('modality_code')
    .notNull()
    .references(() => modalities.code),
  status: text('status')
    .notNull()
    .$type<'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled'>()
    .default('scheduled'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  outcomeNote: text('outcome_note'),
  painScoreAfter: integer('pain_score_after'),
  isOvertime: integer('is_overtime').notNull().default(0),
  ...timestamps,
});

export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  totalConsultations: integer('total_consultations').notNull().default(1),
  totalTherapySessions: integer('total_therapy_sessions').notNull().default(10),
  validityDays: integer('validity_days').notNull().default(30),
  pricePaisa: integer('price_paisa').notNull(),
  isActive: integer('is_active').notNull().default(1),
  ...timestamps,
});

export const packageCredits = sqliteTable('package_credits', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  packageId: text('package_id')
    .notNull()
    .references(() => packages.id),
  billId: text('bill_id'),
  remainingConsultations: integer('remaining_consultations').notNull(),
  remainingSessions: integer('remaining_sessions').notNull(),
  purchasedAt: text('purchased_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  status: text('status')
    .notNull()
    .$type<'active' | 'exhausted' | 'expired' | 'paused'>()
    .default('active'),
  ...timestamps,
});

// --- Phase 5: Billing, Payments, Cash Drawer & Inventory ----------------------

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  billNumber: text('bill_number').notNull().unique(),
  visitId: text('visit_id').references(() => visits.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  cashierStaffId: text('cashier_staff_id').references(() => staff.id),
  subtotalPaisa: integer('subtotal_paisa').notNull(),
  discountPaisa: integer('discount_paisa').notNull().default(0),
  discountApprovedBy: text('discount_approved_by').references(() => staff.id),
  totalPaisa: integer('total_paisa').notNull(),
  paidPaisa: integer('paid_paisa').notNull().default(0),
  duePaisa: integer('due_paisa').notNull().default(0),
  status: text('status')
    .notNull()
    .$type<'draft' | 'posted' | 'voided'>()
    .default('draft'),
  paymentMethod: text('payment_method').default('cash'),
  notes: text('notes'),
  ...timestamps,
});

export const billItems = sqliteTable('bill_items', {
  id: text('id').primaryKey(),
  billId: text('bill_id')
    .notNull()
    .references(() => bills.id),
  itemType: text('item_type')
    .notNull()
    .$type<'consultation' | 'therapy' | 'medicine' | 'package' | 'misc'>(),
  itemId: text('item_id'),
  description: text('description').notNull(),
  unitPricePaisa: integer('unit_price_paisa').notNull(),
  quantity: integer('quantity').notNull().default(1),
  discountPaisa: integer('discount_paisa').notNull().default(0),
  totalPaisa: integer('total_paisa').notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  billId: text('bill_id')
    .notNull()
    .references(() => bills.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  amountPaisa: integer('amount_paisa').notNull(),
  method: text('method')
    .notNull()
    .$type<'cash' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'bank'>(),
  txnId: text('txn_id'),
  receivedByStaffId: text('received_by_staff_id').references(() => staff.id),
  receiptPrintedAt: text('receipt_printed_at'),
  ...timestamps,
});

export const dues = sqliteTable('dues', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  billId: text('bill_id')
    .notNull()
    .references(() => bills.id),
  amountPaisa: integer('amount_paisa').notNull(),
  settledPaisa: integer('settled_paisa').notNull().default(0),
  status: text('status')
    .notNull()
    .$type<'pending' | 'partial' | 'settled'>()
    .default('pending'),
  approvedBy: text('approved_by').references(() => staff.id),
  ...timestamps,
});

export const cashDrawers = sqliteTable('cash_drawers', {
  id: text('id').primaryKey(),
  cashierStaffId: text('cashier_staff_id')
    .notNull()
    .references(() => staff.id),
  deskId: text('desk_id')
    .notNull()
    .references(() => desks.id),
  shiftId: text('shift_id').references(() => shifts.id),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingCashPaisa: integer('opening_cash_paisa').notNull(),
  closingCashActualPaisa: integer('closing_cash_actual_paisa'),
  closingCashExpectedPaisa: integer('closing_cash_expected_paisa'),
  variancePaisa: integer('variance_paisa'),
  varianceReason: text('variance_reason'),
  status: text('status')
    .notNull()
    .$type<'open' | 'closed'>()
    .default('open'),
  closedByAdminId: text('closed_by_admin_id').references(() => users.id),
  ...timestamps,
});

export const drawerEvents = sqliteTable('drawer_events', {
  id: text('id').primaryKey(),
  drawerId: text('drawer_id')
    .notNull()
    .references(() => cashDrawers.id),
  eventType: text('event_type')
    .notNull()
    .$type<'open' | 'drop' | 'payout' | 'sale_cash' | 'close'>(),
  amountPaisa: integer('amount_paisa').notNull(),
  description: text('description'),
  staffId: text('staff_id').references(() => staff.id),
  ...timestamps,
});

export const medicines = sqliteTable('medicines', {
  id: text('id').primaryKey(),
  brandName: text('brand_name').notNull(),
  genericName: text('generic_name').notNull(),
  manufacturer: text('manufacturer'),
  form: text('form').notNull().default('tablet'),
  strength: text('strength'),
  minStockAlert: integer('min_stock_alert').notNull().default(20),
  isActive: integer('is_active').notNull().default(1),
  ...timestamps,
});

export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(),
  medicineId: text('medicine_id')
    .notNull()
    .references(() => medicines.id),
  batchNumber: text('batch_number').notNull(),
  mfgDate: text('mfg_date'),
  expDate: text('exp_date').notNull(),
  purchaseRatePaisa: integer('purchase_rate_paisa').notNull(),
  mrpPaisa: integer('mrp_paisa').notNull(),
  quantityInStock: integer('quantity_in_stock').notNull().default(0),
  isBlocked: integer('is_blocked').notNull().default(0),
  ...timestamps,
});

export const stockMoves = sqliteTable('stock_moves', {
  id: text('id').primaryKey(),
  batchId: text('batch_id')
    .notNull()
    .references(() => batches.id),
  medicineId: text('medicine_id')
    .notNull()
    .references(() => medicines.id),
  moveType: text('move_type')
    .notNull()
    .$type<'purchase' | 'dispense' | 'write_off' | 'return' | 'adjustment'>(),
  quantity: integer('quantity').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  actorStaffId: text('actor_staff_id').references(() => staff.id),
  note: text('note'),
  ...timestamps,
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category')
    .notNull()
    .$type<'consumables' | 'linen' | 'assets' | 'stationery'>(),
  roomId: text('room_id').references(() => rooms.id),
  quantity: integer('quantity').notNull().default(0),
  unit: text('unit').notNull().default('pcs'),
  minStockLevel: integer('min_stock_level').notNull().default(10),
  isActive: integer('is_active').notNull().default(1),
  ...timestamps,
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  category: text('category')
    .notNull()
    .$type<'rent' | 'salary' | 'utilities' | 'maintenance' | 'supplies' | 'misc'>(),
  description: text('description').notNull(),
  amountPaisa: integer('amount_paisa').notNull(),
  voucherNumber: text('voucher_number'),
  approvedByStaffId: text('approved_by_staff_id').references(() => staff.id),
  paidAt: text('paid_at').notNull(),
  ...timestamps,
});

// --- Phase 6: Announcements, Attendance, Feedback ----------------------------

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  messageEn: text('message_en').notNull(),
  messageBn: text('message_bn').notNull(),
  priority: text('priority')
    .notNull()
    .$type<'normal' | 'high' | 'emergency'>()
    .default('normal'),
  targetScreens: text('target_screens').notNull().default('all'),
  activeFrom: text('active_from').notNull(),
  activeUntil: text('active_until'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  staffId: text('staff_id')
    .notNull()
    .references(() => staff.id),
  punchType: text('punch_type').notNull().$type<'in' | 'out'>(),
  deskId: text('desk_id').references(() => desks.id),
  timestamp: text('timestamp').notNull(),
  ip: text('ip'),
  note: text('note'),
});

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  visitId: text('visit_id').references(() => visits.id),
  patientId: text('patient_id').references(() => patients.id),
  doctorStaffId: text('doctor_staff_id').references(() => staff.id),
  therapistStaffId: text('therapist_staff_id').references(() => staff.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  channel: text('channel').notNull().default('kiosk'),
  ...timestamps,
});

export const tvDevices = sqliteTable('tv_devices', {
  id: text('id').primaryKey(),
  pairingCode: text('pairing_code').notNull().unique(),
  deviceName: text('device_name').notNull(),
  location: text('location'),
  department: text('department').notNull().default('ALL'), // 'ALL' | 'CONSULTATION' | 'THERAPY'
  status: text('status').notNull().default('pending'), // 'pending' | 'paired' | 'revoked'
  secretToken: text('secret_token'),
  ipAddress: text('ip_address'),
  appVersion: text('app_version'),
  lastSeenAt: text('last_seen_at'),
  pairedAt: text('paired_at'),
  pairedBy: text('paired_by').references(() => users.id),
  ...timestamps,
});

// Keeps the sqlite import used; WAL/foreign-keys are set in DbModule.
export const pragmaCheck = sql`select 1`;
