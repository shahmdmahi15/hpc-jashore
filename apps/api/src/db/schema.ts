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
  | 'therapist'
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
  consultationFeePaisa: integer('consultation_fee_paisa').notNull().default(50000),
  followUpFeePaisa: integer('follow_up_fee_paisa').notNull().default(0),
  reportFeePaisa: integer('report_fee_paisa').notNull().default(0),
  chamberRoomId: text('chamber_room_id').references(() => rooms.id),
  specialization: text('specialization'),
  qualifications: text('qualifications'),
  dailyQuota: integer('daily_quota').default(40),
  slotDurationMinutes: integer('slot_duration_minutes').default(15),
  dutyStartTime: text('duty_start_time'),
  dutyEndTime: text('duty_end_time'),
  availableDays: text('available_days'),
  customTimeSlots: text('custom_time_slots'),
  notes: text('notes'),
  isApproved: integer('is_approved').notNull().default(0),
  approvalStatus: text('approval_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  approvedAt: text('approved_at'),
  approvedBy: text('approved_by'),
  rejectionReason: text('rejection_reason'),
  ...timestamps,
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
  fingerprint: text('fingerprint'),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  rotatedFromId: text('rotated_from_id'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
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

export const ROOM_TYPES = [
  'waiting_room',
  'public_room',
  'private_room',
  'doctor_consultation_room',
  'therapy_room',
  'therapy_hall',
  'staff_room',
  'cashier_room',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_GENDERS = ['common', 'male', 'female'] as const;
export type RoomGender = (typeof ROOM_GENDERS)[number];

export const ROOM_STATUSES = ['available', 'occupied', 'maintenance', 'not_allowed'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  roomNumber: text('room_number').notNull().unique(),
  code: text('code'),
  name: text('name').notNull(),
  type: text('type').notNull().$type<RoomType>(),
  gender: text('gender').notNull().default('common').$type<RoomGender>(),
  status: text('status').notNull().default('available').$type<RoomStatus>(),
  capacity: integer('capacity').notNull().default(1),
  notes: text('notes'),
  isActive: integer('is_active').notNull().default(1),
  deletedAt: text('deleted_at'),
  ...timestamps,
});

// --- Therapy Slot Configuration ----------------------------------------------

export const DAYS_OF_WEEK = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const SLOT_HOURS = [
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
] as const;
export type SlotHour = (typeof SLOT_HOURS)[number];

export const therapySlotConfigs = sqliteTable('therapy_slot_configs', {
  id: text('id').primaryKey(),
  day: text('day').notNull().$type<DayOfWeek>(),
  slotHour: text('slot_hour').notNull().$type<SlotHour>(),
  slotOrder: integer('slot_order').notNull().default(0),
  slotMaleRegularCapacity: integer('slot_male_regular_capacity').notNull().default(0),
  slotFemaleRegularCapacity: integer('slot_female_regular_capacity').notNull().default(0),
  slotMaleExtraCapacity: integer('slot_male_extra_capacity').notNull().default(0),
  slotFemaleExtraCapacity: integer('slot_female_extra_capacity').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  notes: text('notes'),
  ...timestamps,
});

// --- Phase 2: Patient Directory, Visits, Serials, Appointments ----------------

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  mrn: text('mrn').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn'),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  ageYears: integer('age_years'),
  gender: text('gender').notNull().$type<'male' | 'female'>(),
  bloodGroup: text('blood_group'),
  address: text('address'),
  occupation: text('occupation'),
  emergencyContact: text('emergency_contact'),
  allergies: text('allergies'),
  chronicConditions: text('chronic_conditions'),
  contraindications: text('contraindications'),
  notes: text('notes'),
  consentSigned: integer('consent_signed').notNull().default(1),
  deletedAt: text('deleted_at'),
  ...timestamps,
});

export const THERAPY_BOOKING_STATUSES = [
  'booked',
  'confirmed',
  'attended',
  'completed',
  'cancelled',
] as const;
export type TherapyBookingStatus = (typeof THERAPY_BOOKING_STATUSES)[number];

export const PUNCTUALITY_STATUSES = ['on_time', 'moderate_delay', 'critical_delay'] as const;
export type PunctualityStatus = (typeof PUNCTUALITY_STATUSES)[number];

export const EXTRA_SLOT_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ExtraSlotApprovalStatus = (typeof EXTRA_SLOT_APPROVAL_STATUSES)[number];

export const CONSULTATION_VISIT_TYPES = ['new_consultation', 'follow_up', 'report_review'] as const;
export type ConsultationVisitType = (typeof CONSULTATION_VISIT_TYPES)[number];

export const CONSULTATION_BOOKING_STATUSES = [
  'booked',
  'checked_in',
  'in_queue',
  'calling',
  'in_chamber',
  'in_consultation',
  'completed',
  'cancelled',
] as const;
export type ConsultationBookingStatus = (typeof CONSULTATION_BOOKING_STATUSES)[number];

export const consultationBookings = sqliteTable('consultation_bookings', {
  id: text('id').primaryKey(),
  bookingNumber: text('booking_number').notNull().unique(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id').notNull(),
  bookingDate: text('booking_date').notNull(),
  slotTime: text('slot_time').notNull(),
  toldTime: text('told_time'),
  visitType: text('visit_type').notNull().default('new_consultation').$type<ConsultationVisitType>(),
  feePaisa: integer('fee_paisa').notNull().default(50000),
  serialNumber: integer('serial_number'),
  status: text('status').notNull().default('booked').$type<ConsultationBookingStatus>(),
  checkedInAt: text('checked_in_at'),
  punctualityStatus: text('punctuality_status').$type<PunctualityStatus>(),
  delayMinutes: integer('delay_minutes'),
  inQueueAt: text('in_queue_at'),
  queuedBy: text('queued_by').references(() => users.id),
  serialId: text('serial_id'),
  visitId: text('visit_id'),
  cancelledAt: text('cancelled_at'),
  cancelledBy: text('cancelled_by').references(() => users.id),
  cancellationReason: text('cancellation_reason'),
  notes: text('notes'),
  bookedBy: text('booked_by').references(() => users.id),
  deletedAt: text('deleted_at'),
  ...timestamps,
});

export const therapySlotBookings = sqliteTable('therapy_slot_bookings', {
  id: text('id').primaryKey(),
  bookingNumber: text('booking_number').notNull().unique(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  bookingDate: text('booking_date').notNull(),
  dayOfWeek: text('day_of_week').notNull().$type<DayOfWeek>(),
  slotHour: text('slot_hour').notNull().$type<SlotHour>(),
  toldTime: text('told_time'),
  patientGender: text('patient_gender').notNull().$type<'male' | 'female'>(),
  capacityType: text('capacity_type').notNull().default('regular').$type<'regular' | 'extra'>(),
  status: text('status').notNull().default('booked').$type<TherapyBookingStatus>(),
  approvalStatus: text('approval_status').$type<ExtraSlotApprovalStatus>(),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  rejectedBy: text('rejected_by').references(() => users.id),
  rejectedAt: text('rejected_at'),
  rejectionReason: text('rejection_reason'),
  checkedInAt: text('checked_in_at'),
  punctualityStatus: text('punctuality_status').$type<PunctualityStatus>(),
  delayMinutes: integer('delay_minutes'),
  notes: text('notes'),
  bookedBy: text('booked_by').references(() => users.id),
  deletedAt: text('deleted_at'),
  ...timestamps,
});

export const visits = sqliteTable('visits', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id'),
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
    .$type<'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly' | 'vip'>()
    .default('normal'),
  currentLocation: text('current_location').default('reception'),
  roomId: text('room_id').references(() => rooms.id),
  checkedInAt: text('checked_in_at'),
  checkedOutAt: text('checked_out_at'),
  toldTime: text('told_time'),
  punctualityStatus: text('punctuality_status').$type<PunctualityStatus>(),
  delayMinutes: integer('delay_minutes'),
  therapyBookingId: text('therapy_booking_id').references(() => therapySlotBookings.id),
  consultationBookingId: text('consultation_booking_id'),
  dischargeNotes: text('discharge_notes'),
  nextFollowUpDate: text('next_follow_up_date'),
  clearedBy: text('cleared_by').references(() => users.id),
  notes: text('notes'),
  ...timestamps,
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id').notNull(),
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
  doctorId: text('doctor_id').notNull(),
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
  doctorId: text('doctor_id').notNull(),
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
  doctorId: text('doctor_id').notNull(),
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
  doctorId: text('doctor_id').notNull(),
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

export const therapySessions = sqliteTable('therapy_sessions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').references(() => therapyPlans.id),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  therapistStaffId: text('therapist_staff_id').references(() => users.id),
  bedId: text('bed_id'),
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

export const PACKAGE_TYPES = ['per_session', 'per_day'] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  packageType: text('package_type').notNull().default('per_session').$type<PackageType>(),
  totalConsultations: integer('total_consultations').notNull().default(9999),
  totalTherapySessions: integer('total_therapy_sessions').notNull().default(10),
  totalDays: integer('total_days').notNull().default(0),
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
  remainingConsultations: integer('remaining_consultations').notNull().default(9999),
  remainingSessions: integer('remaining_sessions').notNull().default(0),
  remainingDays: integer('remaining_days').notNull().default(0),
  visitedDatesJson: text('visited_dates_json').notNull().default('[]'),
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
  cashierStaffId: text('cashier_staff_id').references(() => users.id),
  subtotalPaisa: integer('subtotal_paisa').notNull(),
  discountPaisa: integer('discount_paisa').notNull().default(0),
  discountApprovedBy: text('discount_approved_by').references(() => users.id),
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
  receivedByStaffId: text('received_by_staff_id').references(() => users.id),
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
  approvedBy: text('approved_by').references(() => users.id),
  ...timestamps,
});

export const cashDrawers = sqliteTable('cash_drawers', {
  id: text('id').primaryKey(),
  cashierStaffId: text('cashier_staff_id')
    .notNull()
    .references(() => users.id),
  deskId: text('desk_id'),
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
  staffId: text('staff_id').references(() => users.id),
  ...timestamps,
});

export const medicines = sqliteTable('medicines', {
  id: text('id').primaryKey(),
  brandName: text('brand_name').notNull(),
  genericName: text('generic_name').notNull(),
  manufacturer: text('manufacturer'),
  form: text('form').notNull().default('tablet'),
  strength: text('strength'),
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
  approvedByStaffId: text('approved_by_staff_id').references(() => users.id),
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

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  visitId: text('visit_id').references(() => visits.id),
  patientId: text('patient_id').references(() => patients.id),
  doctorStaffId: text('doctor_staff_id').references(() => users.id),
  therapistStaffId: text('therapist_staff_id').references(() => users.id),
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
  theme: text('theme').notNull().default('dark'), // 'dark' | 'light'
  language: text('language').notNull().default('bn'), // 'bn' | 'en'
  status: text('status').notNull().default('pending'), // 'pending' | 'paired' | 'revoked'
  secretToken: text('secret_token'),
  ipAddress: text('ip_address'),
  appVersion: text('app_version'),
  lastSeenAt: text('last_seen_at'),
  pairedAt: text('paired_at'),
  pairedBy: text('paired_by').references(() => users.id),
  forceUpdate: integer('force_update').notNull().default(0),
  ...timestamps,
});

export const bulletins = sqliteTable('bulletins', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contentEn: text('content_en').notNull(),
  contentBn: text('content_bn').notNull(),
  isUrgent: integer('is_urgent').notNull().default(0), // 1 = urgent, 0 = normal
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive
  priority: integer('priority').notNull().default(0),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const INTAKE_FORM_STATUSES = [
  'submitted',
  'forwarded_to_cashier',
  'billed',
  'in_queue',
  'in_consultation',
  'completed',
  'cancelled',
] as const;
export type IntakeFormStatus = (typeof INTAKE_FORM_STATUSES)[number];

export const patientIntakeForms = sqliteTable('patient_intake_forms', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  visitId: text('visit_id').references(() => visits.id),
  consultationBookingId: text('consultation_booking_id'),
  doctorId: text('doctor_id'),
  receptionistId: text('receptionist_id').references(() => users.id),
  receptionistName: text('receptionist_name'),
  date: text('date').notNull(),

  // 1. Personal Info
  name: text('name').notNull(),
  ageYears: integer('age_years'),
  phone: text('phone').notNull(),
  gender: text('gender').notNull().default('male').$type<'male' | 'female' | 'other'>(),
  occupation: text('occupation'),
  address: text('address'),

  // 2. Initial Health Info
  bpSystolic: integer('bp_systolic'),
  bpDiastolic: integer('bp_diastolic'),
  bloodSugar: text('blood_sugar'),
  hasDiabetes: integer('has_diabetes').notNull().default(0), // 0: No, 1: Yes
  weightKg: text('weight_kg'),
  chiefComplaint: text('chief_complaint'),
  problemDuration: text('problem_duration'),

  // 3. Past Medical History
  seenDoctorBefore: integer('seen_doctor_before').notNull().default(0), // 0: No, 1: Yes
  previousDoctorDetails: text('previous_doctor_details'),
  hasPreviousReports: integer('has_previous_reports').notNull().default(0), // 0: No, 1: Yes
  previousReportNames: text('previous_report_names'),
  takesRegularMedication: integer('takes_regular_medication').notNull().default(0), // 0: No, 1: Yes
  regularMedicationDetails: text('regular_medication_details'),
  hasDrugAllergies: integer('has_drug_allergies').notNull().default(0), // 0: No, 1: Yes
  drugAllergyDetails: text('drug_allergy_details'),

  // 4. Referral Source
  referralSource: text('referral_source'), // 'facebook' | 'google' | 'known_person' | 'previous_patient' | 'other'
  referralOtherDetails: text('referral_other_details'),

  // 5. Reception Notes & Status
  specialNotes: text('special_notes'),
  status: text('status').notNull().default('submitted').$type<IntakeFormStatus>(),
  forwardedToCashierAt: text('forwarded_to_cashier_at'),
  billedAt: text('billed_at'),
  queuedAt: text('queued_at'),
  ...timestamps,
});

export const patientTimelineEvents = sqliteTable('patient_timeline_events', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  visitId: text('visit_id'),
  consultationBookingId: text('consultation_booking_id'),
  intakeFormId: text('intake_form_id'),
  step: text('step').notNull(),
  titleEn: text('title_en').notNull(),
  titleBn: text('title_bn').notNull(),
  descriptionEn: text('description_en'),
  descriptionBn: text('description_bn'),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  actorRole: text('actor_role'),
  metadataJson: text('metadata_json'),
  occurredAt: text('occurred_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  date: text('date').notNull(),
});

export const patientAssessmentFiles = sqliteTable('patient_assessment_files', {
  id: text('id').primaryKey(),
  fileNumber: text('file_number').notNull().unique(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id),
  doctorId: text('doctor_id'),
  doctorName: text('doctor_name'),
  visitId: text('visit_id'),
  assessmentDate: text('assessment_date').notNull(),
  // Demographics snapshot
  name: text('name').notNull(),
  age: text('age'),
  gender: text('gender'),
  idNo: text('id_no'),
  occupation: text('occupation'),
  address: text('address'),
  mobile: text('mobile'),
  // Section 2: Pain Details
  painAreas: text('pain_areas'), // JSON array: ["Neck","Shoulder","Back","Knee","Heel","Others"]
  painAreaOthers: text('pain_area_others'),
  side: text('side'), // Right | Left | Both
  duration: text('duration'),
  painTypes: text('pain_types'), // JSON array: ["Sharp","Dull","Burning","Radiating"]
  // Section 3: Pain Scale
  vasScore: integer('vas_score').notNull().default(0), // 0-10
  painIncreasesWith: text('pain_increases_with'), // JSON array: ["Movement","Sitting","Standing","Walking"]
  painReducesWith: text('pain_reduces_with'), // JSON array: ["Rest","Medicine","Heat"]
  // Section 4: History
  injuryAccident: text('injury_accident').default('no'), // yes | no
  injuryDetails: text('injury_details'),
  postureAdvice: text('posture_advice').default('no'), // yes | no
  postureHabits: text('posture_habits'),
  surgeryHistory: text('surgery_history').default('no'), // yes | no
  surgeryDetails: text('surgery_details'),
  previousTreatment: text('previous_treatment'), // JSON array: ["Medicine","Physiotherapy"]
  previousTreatmentDetails: text('previous_treatment_details'),
  // Section 5: Functional Limitation
  functionalLimitations: text('functional_limitations'), // JSON array: ["Bending","Sitting","Standing","Walking","Lifting"]
  functionalNotes: text('functional_notes'),
  // Section 6: Physical Examination
  rom: text('rom').default('Normal'), // Normal | Restricted
  muscleSpasm: text('muscle_spasm').default('no'), // yes | no
  tenderness: text('tenderness').default('no'), // yes | no
  swelling: text('swelling').default('no'), // yes | no
  physicalExamNotes: text('physical_exam_notes'),
  // Section 7: Physiotherapy Diagnosis
  diagnosis: text('diagnosis'),
  // Section 8: Treatment Plan
  treatmentPlans: text('treatment_plans'), // JSON array: ["Hot pack","IFT / TENS","Ultrasound","Stretching","Strengthening","Posture correction"]
  treatmentPlanNotes: text('treatment_plan_notes'),
  prescribedSessions: integer('prescribed_sessions'),
  // Section 9: Home Advice
  exerciseExplained: text('exercise_explained').default('no'), // yes | no
  homePostureAdvice: text('home_posture_advice').default('no'), // yes | no
  homeAdviceNotes: text('home_advice_notes'),
  // Follow-up & Progress
  painScaleAfterTreatment: integer('pain_scale_after_treatment'), // 0-10
  improvement: text('improvement'),
  therapistSignature: text('therapist_signature'),
  status: text('status').notNull().default('active'),
  ...timestamps,
});

export const CHAT_PRIORITIES = ['normal', 'urgent', 'stat'] as const;
export type ChatPriority = (typeof CHAT_PRIORITIES)[number];

export const CHAT_MESSAGE_TYPES = [
  'text',
  'patient_mention',
  'clinical_handoff',
  'broadcast',
] as const;
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chatDate: text('chat_date').notNull(), // 'YYYY-MM-DD'
  senderUserId: text('sender_user_id')
    .notNull()
    .references(() => users.id),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  content: text('content').notNull(),
  priority: text('priority').notNull().default('normal').$type<ChatPriority>(),
  messageType: text('message_type')
    .notNull()
    .default('text')
    .$type<ChatMessageType>(),
  patientId: text('patient_id').references(() => patients.id),
  patientMrn: text('patient_mrn'),
  patientName: text('patient_name'),
  mentions: text('mentions'), // JSON string array of user IDs/roles
  metadata: text('metadata'), // JSON string
  ...timestamps,
});

// Keeps the sqlite import used; WAL/foreign-keys are set in DbModule.
export const pragmaCheck = sql`select 1`;
